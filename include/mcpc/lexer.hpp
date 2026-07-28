// lexer.hpp - Hand-written lexer for the MiniCPP language subset.
#pragma once
#include "mcpc/token.hpp"
#include <vector>
#include <string>

namespace mcpc {

// Thrown on unrecoverable lexical errors (after diagnostic already printed,
// this lets the driver stop cleanly).
struct LexError {
    std::string message;
    SourceLoc loc;
};

class Lexer {
public:
    Lexer(std::string source, std::string filename);

    // Tokenizes the whole input and returns the token stream, ending with EndOfFile.
    // Also strips comments and handles simple #include/#define-free preprocessing
    // (a minimal preprocessor pass is run before this, see Preprocessor).
    std::vector<Token> tokenize();

private:
    std::string src_;
    std::string filename_;
    size_t pos_ = 0;
    int line_ = 1;
    int col_ = 1;

    bool atEnd() const;
    char peek(int off = 0) const;
    char advance();
    bool match(char expected);
    void skipWhitespaceAndComments();
    Token makeToken(TokKind kind, std::string text, int64_t intVal = 0, SourceLoc startLoc = {});
    Token lexIdentifierOrKeyword();
    Token lexNumber();
    Token lexCharLiteral();
    Token lexStringLiteral();
    SourceLoc here() const;
};

} // namespace mcpc
