// parser.cpp - Recursive-descent parser producing the MiniCPP AST.
//
// Grammar summary (informal EBNF):
//
//   translation_unit := { top_level_decl }
//   top_level_decl   := struct_decl | class_decl | (type ident (func_tail | var_tail))
//   struct_decl      := 'struct' ident '{' { field } '}' ';'
//   class_decl       := 'class' ident [ ':' 'public' ident ] '{' { member } '}' ';'
//   func_tail        := '(' params ')' (block | ';')
//   var_tail         := [ '=' expr ] ';'
//   statement        := block | if | while | for | return | break | continue
//                      | var_decl | expr_stmt
//   expression       := assignment
//   assignment       := logic_or [ ('=' | '+=' | '-=' | '*=' | '/=') assignment ]
//   ... standard C precedence down to primary.
//
// Type-vs-expression disambiguation for statement-level declarations uses the
// standard lightweight heuristic: `Identifier Identifier` (optionally with
// intervening '*') is treated as a declaration, since this subset has no
// function-style casts or other constructs that would collide with it.
#include "mcpc/parser.hpp"
#include <sstream>

namespace mcpc {

Parser::Parser(std::vector<Token> tokens) : toks_(std::move(tokens)) {}

const Token& Parser::peek(int off) const {
    size_t p = pos_ + off;
    if (p >= toks_.size()) return toks_.back(); // EOF
    return toks_[p];
}
const Token& Parser::cur() const { return peek(0); }
bool Parser::check(TokKind k) const { return cur().kind == k; }
bool Parser::checkAny(std::initializer_list<TokKind> ks) const {
    for (auto k : ks) if (check(k)) return true;
    return false;
}
const Token& Parser::advance() {
    const Token& t = toks_[pos_];
    if (pos_ + 1 < toks_.size()) pos_++;
    return t;
}
bool Parser::matchTok(TokKind k) {
    if (check(k)) { advance(); return true; }
    return false;
}
const Token& Parser::expect(TokKind k, const char* what) {
    if (!check(k)) {
        std::ostringstream ss;
        ss << "expected " << what << " but found '" << cur().text << "'";
        error(ss.str());
    }
    return advance();
}
void Parser::error(const std::string& msg) const {
    throw ParseError{msg, cur().loc};
}

bool Parser::isTypeStart() const {
    if (checkAny({TokKind::KwInt, TokKind::KwChar, TokKind::KwBool, TokKind::KwVoid})) return true;
    if (check(TokKind::Identifier)) {
        // Heuristic: Identifier ['*']* Identifier => this identifier starts a type.
        int off = 1;
        while (peek(off).kind == TokKind::Star) off++;
        return peek(off).kind == TokKind::Identifier;
    }
    return false;
}

TypeName Parser::parseTypeName() {
    TypeName t;
    if (checkAny({TokKind::KwInt, TokKind::KwChar, TokKind::KwBool, TokKind::KwVoid})) {
        t.baseName = cur().text;
        advance();
    } else {
        t.baseName = expect(TokKind::Identifier, "type name").text;
    }
    while (matchTok(TokKind::Star)) t.pointerDepth++;
    return t;
}

TranslationUnit Parser::parseTranslationUnit() {
    TranslationUnit tu;
    while (!check(TokKind::EndOfFile)) {
        tu.decls.push_back(parseTopLevelDecl());
    }
    return tu;
}

DeclPtr Parser::parseTopLevelDecl() {
    if (check(TokKind::KwStruct)) return parseStructDecl();
    if (check(TokKind::KwClass)) return parseClassDecl();
    TypeName type = parseTypeName();
    std::string name = expect(TokKind::Identifier, "declaration name").text;
    return parseFunctionOrGlobalVar(std::move(type), std::move(name));
}

std::unique_ptr<StructDecl> Parser::parseStructDecl() {
    SourceLoc loc = cur().loc;
    expect(TokKind::KwStruct, "'struct'");
    std::string name = expect(TokKind::Identifier, "struct name").text;
    auto decl = std::make_unique<StructDecl>(name, loc);
    expect(TokKind::LBrace, "'{'");
    while (!check(TokKind::RBrace)) {
        FieldDecl f;
        f.declaredType = parseTypeName();
        f.name = expect(TokKind::Identifier, "field name").text;
        expect(TokKind::Semicolon, "';'");
        decl->fields.push_back(std::move(f));
    }
    expect(TokKind::RBrace, "'}'");
    expect(TokKind::Semicolon, "';' after struct declaration");
    return decl;
}

std::unique_ptr<ClassDecl> Parser::parseClassDecl() {
    SourceLoc loc = cur().loc;
    expect(TokKind::KwClass, "'class'");
    std::string name = expect(TokKind::Identifier, "class name").text;
    std::string base;
    if (matchTok(TokKind::Colon)) {
        matchTok(TokKind::KwPublic); // only public single inheritance supported
        base = expect(TokKind::Identifier, "base class name").text;
    }
    auto decl = std::make_unique<ClassDecl>(name, base, loc);
    expect(TokKind::LBrace, "'{'");
    // Access specifiers are parsed but not enforced in this subset.
    while (!check(TokKind::RBrace)) {
        if (checkAny({TokKind::KwPublic, TokKind::KwPrivate, TokKind::KwProtected})) {
            advance();
            expect(TokKind::Colon, "':'");
            continue;
        }
        SourceLoc memberLoc = cur().loc;
        // Constructor: identifier matching class name followed by '('.
        if (check(TokKind::Identifier) && cur().text == name && peek(1).kind == TokKind::LParen) {
            advance(); // consume class name
            auto params = parseParamList();
            auto body = parseBlock();
            TypeName voidRt; voidRt.baseName = "void";
            auto ctor = std::make_unique<FunctionDecl>(voidRt, name, std::move(params), std::move(body), memberLoc);
            ctor->isMethod = true;
            ctor->isConstructor = true;
            ctor->ownerClass = name;
            decl->methods.push_back(std::move(ctor));
            continue;
        }
        TypeName type = parseTypeName();
        std::string memberName = expect(TokKind::Identifier, "member name").text;
        if (check(TokKind::LParen)) {
            auto params = parseParamList();
            std::unique_ptr<BlockStmt> body;
            if (check(TokKind::LBrace)) body = parseBlock();
            else expect(TokKind::Semicolon, "';'");
            auto method = std::make_unique<FunctionDecl>(type, memberName, std::move(params), std::move(body), memberLoc);
            method->isMethod = true;
            method->ownerClass = name;
            decl->methods.push_back(std::move(method));
        } else {
            FieldDecl f;
            f.declaredType = type;
            f.name = memberName;
            expect(TokKind::Semicolon, "';'");
            decl->fields.push_back(std::move(f));
        }
    }
    expect(TokKind::RBrace, "'}'");
    expect(TokKind::Semicolon, "';' after class declaration");
    return decl;
}

std::vector<Param> Parser::parseParamList() {
    std::vector<Param> params;
    expect(TokKind::LParen, "'('");
    if (!check(TokKind::RParen)) {
        do {
            Param p;
            p.declaredType = parseTypeName();
            p.name = expect(TokKind::Identifier, "parameter name").text;
            params.push_back(std::move(p));
        } while (matchTok(TokKind::Comma));
    }
    expect(TokKind::RParen, "')'");
    return params;
}

DeclPtr Parser::parseFunctionOrGlobalVar(TypeName type, std::string name) {
    SourceLoc loc = cur().loc;
    if (check(TokKind::LParen)) {
        auto params = parseParamList();
        std::unique_ptr<BlockStmt> body;
        if (check(TokKind::LBrace)) body = parseBlock();
        else expect(TokKind::Semicolon, "';'");
        return std::make_unique<FunctionDecl>(type, name, std::move(params), std::move(body), loc);
    }
    ExprPtr init;
    if (matchTok(TokKind::Assign)) init = parseExpression();
    expect(TokKind::Semicolon, "';'");
    return std::make_unique<GlobalVarDecl>(type, name, std::move(init), loc);
}

std::unique_ptr<BlockStmt> Parser::parseBlock() {
    SourceLoc loc = cur().loc;
    expect(TokKind::LBrace, "'{'");
    auto block = std::make_unique<BlockStmt>(loc);
    while (!check(TokKind::RBrace)) block->stmts.push_back(parseStatement());
    expect(TokKind::RBrace, "'}'");
    return block;
}

StmtPtr Parser::parseStatement() {
    if (check(TokKind::LBrace)) return parseBlock();
    if (check(TokKind::KwIf)) return parseIfStmt();
    if (check(TokKind::KwWhile)) return parseWhileStmt();
    if (check(TokKind::KwFor)) return parseForStmt();
    if (check(TokKind::KwReturn)) return parseReturnStmt();
    if (check(TokKind::KwBreak)) {
        SourceLoc l = cur().loc; advance(); expect(TokKind::Semicolon, "';'");
        return std::make_unique<BreakStmt>(l);
    }
    if (check(TokKind::KwContinue)) {
        SourceLoc l = cur().loc; advance(); expect(TokKind::Semicolon, "';'");
        return std::make_unique<ContinueStmt>(l);
    }
    if (isTypeStart()) return parseVarDeclStmt();
    SourceLoc l = cur().loc;
    auto e = parseExpression();
    expect(TokKind::Semicolon, "';'");
    return std::make_unique<ExprStmt>(std::move(e), l);
}

StmtPtr Parser::parseVarDeclStmt() {
    SourceLoc l = cur().loc;
    TypeName type = parseTypeName();
    std::string name = expect(TokKind::Identifier, "variable name").text;
    ExprPtr init;
    if (matchTok(TokKind::Assign)) init = parseExpression();
    expect(TokKind::Semicolon, "';'");
    return std::make_unique<VarDeclStmt>(type, name, std::move(init), l);
}

StmtPtr Parser::parseIfStmt() {
    SourceLoc l = cur().loc;
    expect(TokKind::KwIf, "'if'");
    expect(TokKind::LParen, "'('");
    auto cond = parseExpression();
    expect(TokKind::RParen, "')'");
    auto thenB = parseStatement();
    StmtPtr elseB;
    if (matchTok(TokKind::KwElse)) elseB = parseStatement();
    return std::make_unique<IfStmt>(std::move(cond), std::move(thenB), std::move(elseB), l);
}

StmtPtr Parser::parseWhileStmt() {
    SourceLoc l = cur().loc;
    expect(TokKind::KwWhile, "'while'");
    expect(TokKind::LParen, "'('");
    auto cond = parseExpression();
    expect(TokKind::RParen, "')'");
    auto body = parseStatement();
    return std::make_unique<WhileStmt>(std::move(cond), std::move(body), l);
}

StmtPtr Parser::parseForStmt() {
    SourceLoc l = cur().loc;
    expect(TokKind::KwFor, "'for'");
    expect(TokKind::LParen, "'('");
    StmtPtr init;
    if (!check(TokKind::Semicolon)) {
        if (isTypeStart()) init = parseVarDeclStmt();
        else {
            SourceLoc il = cur().loc;
            auto e = parseExpression();
            expect(TokKind::Semicolon, "';'");
            init = std::make_unique<ExprStmt>(std::move(e), il);
        }
    } else {
        advance(); // consume ';'
    }
    ExprPtr cond;
    if (!check(TokKind::Semicolon)) cond = parseExpression();
    expect(TokKind::Semicolon, "';'");
    ExprPtr step;
    if (!check(TokKind::RParen)) step = parseExpression();
    expect(TokKind::RParen, "')'");
    auto body = parseStatement();
    return std::make_unique<ForStmt>(std::move(init), std::move(cond), std::move(step), std::move(body), l);
}

StmtPtr Parser::parseReturnStmt() {
    SourceLoc l = cur().loc;
    expect(TokKind::KwReturn, "'return'");
    ExprPtr v;
    if (!check(TokKind::Semicolon)) v = parseExpression();
    expect(TokKind::Semicolon, "';'");
    return std::make_unique<ReturnStmt>(std::move(v), l);
}

// ------------------------------ Expressions ------------------------------

ExprPtr Parser::parseExpression() { return parseAssignment(); }

ExprPtr Parser::parseAssignment() {
    auto lhs = parseLogicalOr();
    if (checkAny({TokKind::Assign, TokKind::PlusAssign, TokKind::MinusAssign,
                  TokKind::StarAssign, TokKind::SlashAssign})) {
        std::string op = cur().text;
        SourceLoc l = cur().loc;
        advance();
        auto rhs = parseAssignment(); // right-associative
        return std::make_unique<AssignExpr>(op, std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}

ExprPtr Parser::parseLogicalOr() {
    auto lhs = parseLogicalAnd();
    while (check(TokKind::PipePipe)) {
        SourceLoc l = cur().loc; advance();
        auto rhs = parseLogicalAnd();
        lhs = std::make_unique<BinaryExpr>("||", std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseLogicalAnd() {
    auto lhs = parseEquality();
    while (check(TokKind::AmpAmp)) {
        SourceLoc l = cur().loc; advance();
        auto rhs = parseEquality();
        lhs = std::make_unique<BinaryExpr>("&&", std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseEquality() {
    auto lhs = parseRelational();
    while (checkAny({TokKind::Eq, TokKind::Ne})) {
        std::string op = cur().text; SourceLoc l = cur().loc; advance();
        auto rhs = parseRelational();
        lhs = std::make_unique<BinaryExpr>(op, std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseRelational() {
    auto lhs = parseAdditive();
    while (checkAny({TokKind::Lt, TokKind::Le, TokKind::Gt, TokKind::Ge})) {
        std::string op = cur().text; SourceLoc l = cur().loc; advance();
        auto rhs = parseAdditive();
        lhs = std::make_unique<BinaryExpr>(op, std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseAdditive() {
    auto lhs = parseMultiplicative();
    while (checkAny({TokKind::Plus, TokKind::Minus})) {
        std::string op = cur().text; SourceLoc l = cur().loc; advance();
        auto rhs = parseMultiplicative();
        lhs = std::make_unique<BinaryExpr>(op, std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseMultiplicative() {
    auto lhs = parseUnary();
    while (checkAny({TokKind::Star, TokKind::Slash, TokKind::Percent})) {
        std::string op = cur().text; SourceLoc l = cur().loc; advance();
        auto rhs = parseUnary();
        lhs = std::make_unique<BinaryExpr>(op, std::move(lhs), std::move(rhs), l);
    }
    return lhs;
}
ExprPtr Parser::parseUnary() {
    SourceLoc l = cur().loc;
    if (check(TokKind::Minus)) { advance(); return std::make_unique<UnaryExpr>("-", parseUnary(), l); }
    if (check(TokKind::Bang))  { advance(); return std::make_unique<UnaryExpr>("!", parseUnary(), l); }
    if (check(TokKind::Tilde)) { advance(); return std::make_unique<UnaryExpr>("~", parseUnary(), l); }
    if (check(TokKind::Amp))   { advance(); return std::make_unique<AddrOfExpr>(parseUnary(), l); }
    if (check(TokKind::Star))  { advance(); return std::make_unique<DerefExpr>(parseUnary(), l); }
    if (check(TokKind::PlusPlus))  { advance(); return std::make_unique<UnaryExpr>("++pre", parseUnary(), l); }
    if (check(TokKind::MinusMinus)) { advance(); return std::make_unique<UnaryExpr>("--pre", parseUnary(), l); }
    return parsePostfix();
}

ExprPtr Parser::parsePostfix() {
    auto e = parsePrimary();
    for (;;) {
        SourceLoc l = cur().loc;
        if (check(TokKind::LParen)) {
            auto args = parseArgList();
            e = std::make_unique<CallExpr>(std::move(e), std::move(args), l);
        } else if (check(TokKind::Dot)) {
            advance();
            std::string m = expect(TokKind::Identifier, "member name").text;
            e = std::make_unique<MemberExpr>(std::move(e), m, false, l);
        } else if (check(TokKind::Arrow)) {
            advance();
            std::string m = expect(TokKind::Identifier, "member name").text;
            e = std::make_unique<MemberExpr>(std::move(e), m, true, l);
        } else if (check(TokKind::LBracket)) {
            advance();
            auto idx = parseExpression();
            expect(TokKind::RBracket, "']'");
            e = std::make_unique<IndexExpr>(std::move(e), std::move(idx), l);
        } else if (check(TokKind::PlusPlus)) {
            advance();
            e = std::make_unique<PostIncDecExpr>("++", std::move(e), l);
        } else if (check(TokKind::MinusMinus)) {
            advance();
            e = std::make_unique<PostIncDecExpr>("--", std::move(e), l);
        } else break;
    }
    return e;
}

std::vector<ExprPtr> Parser::parseArgList() {
    std::vector<ExprPtr> args;
    expect(TokKind::LParen, "'('");
    if (!check(TokKind::RParen)) {
        do { args.push_back(parseExpression()); } while (matchTok(TokKind::Comma));
    }
    expect(TokKind::RParen, "')'");
    return args;
}

ExprPtr Parser::parsePrimary() {
    SourceLoc l = cur().loc;
    if (check(TokKind::IntLiteral)) { auto v = cur().intValue; advance(); return std::make_unique<IntLiteralExpr>(v, l); }
    if (check(TokKind::CharLiteral)) { auto v = cur().intValue; advance(); return std::make_unique<CharLiteralExpr>(v, l); }
    if (check(TokKind::StringLiteral)) { auto v = cur().text; advance(); return std::make_unique<StringLiteralExpr>(v, l); }
    if (check(TokKind::KwTrue)) { advance(); return std::make_unique<BoolLiteralExpr>(true, l); }
    if (check(TokKind::KwFalse)) { advance(); return std::make_unique<BoolLiteralExpr>(false, l); }
    if (check(TokKind::KwThis)) { advance(); return std::make_unique<ThisExpr>(l); }
    if (check(TokKind::KwNew)) {
        advance();
        std::string tn = expect(TokKind::Identifier, "type name after 'new'").text;
        std::vector<ExprPtr> args;
        if (check(TokKind::LParen)) args = parseArgList();
        return std::make_unique<NewExpr>(tn, std::move(args), l);
    }
    if (check(TokKind::Identifier)) { auto n = cur().text; advance(); return std::make_unique<IdentifierExpr>(n, l); }
    if (matchTok(TokKind::LParen)) {
        auto e = parseExpression();
        expect(TokKind::RParen, "')'");
        return e;
    }
    error("expected expression, found '" + cur().text + "'");
}

} // namespace mcpc
