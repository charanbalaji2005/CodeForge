// parser.hpp - Recursive-descent + precedence-climbing parser for MiniCPP.
#pragma once
#include "mcpc/token.hpp"
#include "mcpc/ast.hpp"
#include <vector>
#include <memory>

namespace mcpc {

struct ParseError {
    std::string message;
    SourceLoc loc;
};

class Parser {
public:
    explicit Parser(std::vector<Token> tokens);
    TranslationUnit parseTranslationUnit();

private:
    std::vector<Token> toks_;
    size_t pos_ = 0;

    const Token& peek(int off = 0) const;
    const Token& cur() const;
    bool check(TokKind k) const;
    bool checkAny(std::initializer_list<TokKind> ks) const;
    const Token& advance();
    const Token& expect(TokKind k, const char* what);
    bool matchTok(TokKind k);
    [[noreturn]] void error(const std::string& msg) const;

    bool isTypeStart() const;
    TypeName parseTypeName();

    DeclPtr parseTopLevelDecl();
    std::unique_ptr<StructDecl> parseStructDecl();
    std::unique_ptr<ClassDecl> parseClassDecl();
    DeclPtr parseFunctionOrGlobalVar(TypeName type, std::string name);
    std::vector<Param> parseParamList();

    StmtPtr parseStatement();
    std::unique_ptr<BlockStmt> parseBlock();
    StmtPtr parseVarDeclStmt();
    StmtPtr parseIfStmt();
    StmtPtr parseWhileStmt();
    StmtPtr parseForStmt();
    StmtPtr parseReturnStmt();

    // Expression parsing (precedence climbing).
    ExprPtr parseExpression();     // assignment level (lowest)
    ExprPtr parseAssignment();
    ExprPtr parseLogicalOr();
    ExprPtr parseLogicalAnd();
    ExprPtr parseEquality();
    ExprPtr parseRelational();
    ExprPtr parseAdditive();
    ExprPtr parseMultiplicative();
    ExprPtr parseUnary();
    ExprPtr parsePostfix();
    ExprPtr parsePrimary();
    std::vector<ExprPtr> parseArgList();
};

} // namespace mcpc
