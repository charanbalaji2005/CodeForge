// codegen.hpp - Tree-walking x86-64 (System V ABI) code generator.
//
// Strategy: no register allocator yet (that's real future work — see
// README) — every local variable and every intermediate expression value
// lives on the stack. This keeps codegen simple and unambiguously correct,
// at the cost of speed; it is the same strategy used by many first-pass
// "correctness first" compilers before a register allocator is added.
#pragma once
#include "mcpc/ast.hpp"
#include "mcpc/sema.hpp"
#include <sstream>
#include <unordered_map>

namespace mcpc {

class Codegen {
public:
    explicit Codegen(Sema& sema) : sema_(sema) {}
    std::string generate(TranslationUnit& tu);

private:
    Sema& sema_;
    std::ostringstream out_;
    int labelCounter_ = 0;
    int frameSize_ = 0;
    std::unordered_map<std::string, int> localOffset_; // name -> byte offset from rbp (negative)
    bool currentIsMethod_ = false;
    std::string currentOwnerClass_;
    std::vector<FieldDecl*> currentOwnerFields_; // fields of the enclosing method's owner class (incl. inherited)
    std::vector<std::pair<std::string, std::string>> loopLabels_; // (continueLabel, breakLabel) stack

    std::string newLabel(const std::string& hint);

    void collectLocals(Stmt& s, int& nextOffset);
    void assignSlot(const std::string& name, int& nextOffset);

    void emitFunction(FunctionDecl& fn, const std::string& label);
    void emitStmt(Stmt& s);
    void emitBlock(BlockStmt& b);

    // Evaluates an expression, leaving the scalar result in %rax.
    void emitExpr(Expr& e);
    // Computes the address of an lvalue expression, leaving it in %rax.
    void emitAddress(Expr& e);
    void emitCall(CallExpr& c);
    void emitNew(NewExpr& n);

    int sizeOfType(const TypePtr& t) const;
    const RecordInfo* recordFor(const TypePtr& t) const;
};

} // namespace mcpc
