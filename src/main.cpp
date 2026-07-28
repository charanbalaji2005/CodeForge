// main.cpp - mcpc compiler driver: source -> tokens -> AST -> sema -> asm ->
// object file (via `as`) -> executable (via `ld`, statically linked against
// only our own runtime, no libc).
#include "mcpc/lexer.hpp"
#include "mcpc/parser.hpp"
#include "mcpc/sema.hpp"
#include "mcpc/codegen.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <filesystem>

namespace fs = std::filesystem;

static std::string readFile(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw std::runtime_error("cannot open " + path);
    std::stringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: mcpc <file.mcpp> [-o <output>] [-S] [--keep-temps]\n";
        return 1;
    }
    std::string inputPath;
    std::string outputPath = "a.out";
    bool emitAsmOnly = false;
    bool keepTemps = false;
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "-o" && i + 1 < argc) outputPath = argv[++i];
        else if (arg == "-S") emitAsmOnly = true;
        else if (arg == "--keep-temps") keepTemps = true;
        else inputPath = arg;
    }
    if (inputPath.empty()) {
        std::cerr << "error: no input file\n";
        return 1;
    }

    std::string source;
    try {
        source = readFile(inputPath);
    } catch (const std::exception& e) {
        std::cerr << "error: " << e.what() << "\n";
        return 1;
    }

    std::string asmText;
    try {
        mcpc::Lexer lexer(source, inputPath);
        auto toks = lexer.tokenize();
        mcpc::Parser parser(std::move(toks));
        auto tu = parser.parseTranslationUnit();
        mcpc::Sema sema;
        sema.run(tu);
        mcpc::Codegen codegen(sema);
        asmText = codegen.generate(tu);
    } catch (const mcpc::LexError& e) {
        std::cerr << inputPath << ":" << e.loc.line << ":" << e.loc.col << ": lex error: " << e.message << "\n";
        return 1;
    } catch (const mcpc::ParseError& e) {
        std::cerr << inputPath << ":" << e.loc.line << ":" << e.loc.col << ": parse error: " << e.message << "\n";
        return 1;
    } catch (const mcpc::SemaError& e) {
        std::cerr << inputPath << ":" << e.loc.line << ":" << e.loc.col << ": error: " << e.message << "\n";
        return 1;
    }

    if (emitAsmOnly) {
        std::ofstream out(outputPath);
        out << asmText;
        std::cout << "wrote " << outputPath << "\n";
        return 0;
    }

    // Assemble + link into a real native executable via `as` and `ld`.
    fs::path tmpDir = fs::temp_directory_path() / ("mcpc_" + std::to_string(getpid()));
    fs::create_directories(tmpDir);
    fs::path asmPath = tmpDir / "prog.s";
    fs::path objPath = tmpDir / "prog.o";
    // Locate runtime/start.s relative to the compiler binary (installed layout:
    // <prefix>/bin/mcpc + <prefix>/runtime/start.s, or run-in-place from build/).
    fs::path exeDir = fs::weakly_canonical(fs::path(argv[0])).parent_path();
    std::vector<fs::path> candidates = {
        exeDir / "runtime" / "start.s",
        exeDir.parent_path() / "runtime" / "start.s",
        fs::current_path() / "runtime" / "start.s",
    };
    if (const char* env = std::getenv("MCPC_RUNTIME")) candidates.insert(candidates.begin(), fs::path(env));
    fs::path runtimeSrc;
    for (auto& c : candidates) if (fs::exists(c)) { runtimeSrc = c; break; }
    if (runtimeSrc.empty()) {
        std::cerr << "error: could not locate runtime/start.s (searched next to the mcpc binary, "
                     "its parent directory, and the current directory; set MCPC_RUNTIME to override)\n";
        return 1;
    }
    fs::path runtimeObj = tmpDir / "runtime.o";

    { std::ofstream out(asmPath); out << asmText; }

    std::string asCmd1 = "as --64 -o " + objPath.string() + " " + asmPath.string();
    std::string asCmd2 = "as --64 -o " + runtimeObj.string() + " " + runtimeSrc.string();
    if (std::system(asCmd1.c_str()) != 0) { std::cerr << "assembler failed on generated code\n"; return 1; }
    if (std::system(asCmd2.c_str()) != 0) { std::cerr << "assembler failed on runtime\n"; return 1; }

    std::string ldCmd = "ld -static -e _start -o " + outputPath + " " + objPath.string() + " " + runtimeObj.string();
    if (std::system(ldCmd.c_str()) != 0) { std::cerr << "linker failed\n"; return 1; }

    if (!keepTemps) fs::remove_all(tmpDir);
    std::cout << "wrote " << outputPath << "\n";
    return 0;
}
