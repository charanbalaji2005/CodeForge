// ast.hpp - Strongly-typed AST node hierarchy for the MiniCPP subset.
#pragma once
#include "mcpc/token.hpp"
#include "mcpc/type.hpp"
#include <vector>
#include <memory>
#include <string>

namespace mcpc {

// ------------------------------- Expressions -------------------------------

enum class ExprKind {
    IntLiteral, CharLiteral, BoolLiteral, StringLiteral,
    Identifier, Binary, Unary, Assign, Call, Member, Index,
    AddrOf, Deref, New, This, PostIncDec
};

struct Expr {
    ExprKind kind;
    SourceLoc loc;
    TypePtr type; // filled in by Sema
    virtual ~Expr() = default;
    explicit Expr(ExprKind k, SourceLoc l) : kind(k), loc(l) {}
};
using ExprPtr = std::unique_ptr<Expr>;

struct IntLiteralExpr : Expr {
    int64_t value;
    IntLiteralExpr(int64_t v, SourceLoc l) : Expr(ExprKind::IntLiteral, l), value(v) {}
};
struct CharLiteralExpr : Expr {
    int64_t value;
    CharLiteralExpr(int64_t v, SourceLoc l) : Expr(ExprKind::CharLiteral, l), value(v) {}
};
struct BoolLiteralExpr : Expr {
    bool value;
    BoolLiteralExpr(bool v, SourceLoc l) : Expr(ExprKind::BoolLiteral, l), value(v) {}
};
struct StringLiteralExpr : Expr {
    std::string value;
    int labelId = -1; // assigned by codegen for .rodata label
    StringLiteralExpr(std::string v, SourceLoc l) : Expr(ExprKind::StringLiteral, l), value(std::move(v)) {}
};
struct IdentifierExpr : Expr {
    std::string name;
    IdentifierExpr(std::string n, SourceLoc l) : Expr(ExprKind::Identifier, l), name(std::move(n)) {}
};
struct BinaryExpr : Expr {
    std::string op;
    ExprPtr lhs, rhs;
    BinaryExpr(std::string o, ExprPtr l_, ExprPtr r_, SourceLoc l)
        : Expr(ExprKind::Binary, l), op(std::move(o)), lhs(std::move(l_)), rhs(std::move(r_)) {}
};
struct UnaryExpr : Expr {
    std::string op; // "-", "!", "~", "++pre", "--pre"
    ExprPtr operand;
    UnaryExpr(std::string o, ExprPtr e, SourceLoc l)
        : Expr(ExprKind::Unary, l), op(std::move(o)), operand(std::move(e)) {}
};
struct PostIncDecExpr : Expr {
    std::string op; // "++" or "--"
    ExprPtr operand;
    PostIncDecExpr(std::string o, ExprPtr e, SourceLoc l)
        : Expr(ExprKind::PostIncDec, l), op(std::move(o)), operand(std::move(e)) {}
};
struct AssignExpr : Expr {
    std::string op; // "=", "+=", "-=", "*=", "/="
    ExprPtr target, value;
    AssignExpr(std::string o, ExprPtr t, ExprPtr v, SourceLoc l)
        : Expr(ExprKind::Assign, l), op(std::move(o)), target(std::move(t)), value(std::move(v)) {}
};
struct CallExpr : Expr {
    ExprPtr callee; // Identifier or Member (method call)
    std::vector<ExprPtr> args;
    CallExpr(ExprPtr c, std::vector<ExprPtr> a, SourceLoc l)
        : Expr(ExprKind::Call, l), callee(std::move(c)), args(std::move(a)) {}
};
struct MemberExpr : Expr {
    ExprPtr base;
    std::string member;
    bool arrow; // true for ->, false for .
    MemberExpr(ExprPtr b, std::string m, bool arr, SourceLoc l)
        : Expr(ExprKind::Member, l), base(std::move(b)), member(std::move(m)), arrow(arr) {}
};
struct IndexExpr : Expr {
    ExprPtr base, index;
    IndexExpr(ExprPtr b, ExprPtr i, SourceLoc l)
        : Expr(ExprKind::Index, l), base(std::move(b)), index(std::move(i)) {}
};
struct AddrOfExpr : Expr {
    ExprPtr operand;
    AddrOfExpr(ExprPtr e, SourceLoc l) : Expr(ExprKind::AddrOf, l), operand(std::move(e)) {}
};
struct DerefExpr : Expr {
    ExprPtr operand;
    DerefExpr(ExprPtr e, SourceLoc l) : Expr(ExprKind::Deref, l), operand(std::move(e)) {}
};
struct NewExpr : Expr {
    std::string typeName;
    std::vector<ExprPtr> ctorArgs;
    NewExpr(std::string t, std::vector<ExprPtr> a, SourceLoc l)
        : Expr(ExprKind::New, l), typeName(std::move(t)), ctorArgs(std::move(a)) {}
};
struct ThisExpr : Expr {
    explicit ThisExpr(SourceLoc l) : Expr(ExprKind::This, l) {}
};

// -------------------------------- Statements --------------------------------

enum class StmtKind { Block, ExprStmt, VarDecl, If, While, For, Return, Break, Continue };

struct Stmt {
    StmtKind kind;
    SourceLoc loc;
    virtual ~Stmt() = default;
    explicit Stmt(StmtKind k, SourceLoc l) : kind(k), loc(l) {}
};
using StmtPtr = std::unique_ptr<Stmt>;

struct BlockStmt : Stmt {
    std::vector<StmtPtr> stmts;
    explicit BlockStmt(SourceLoc l) : Stmt(StmtKind::Block, l) {}
};
struct ExprStmt : Stmt {
    ExprPtr expr;
    ExprStmt(ExprPtr e, SourceLoc l) : Stmt(StmtKind::ExprStmt, l), expr(std::move(e)) {}
};
// Declared type as written in source: baseTypeName + pointerDepth.
struct TypeName {
    std::string baseName; // "int", "char", "bool", "void", or a struct/class name
    int pointerDepth = 0;
};
struct VarDeclStmt : Stmt {
    TypeName declaredType;
    std::string name;
    ExprPtr init; // may be null
    TypePtr resolvedType;
    VarDeclStmt(TypeName t, std::string n, ExprPtr i, SourceLoc l)
        : Stmt(StmtKind::VarDecl, l), declaredType(std::move(t)), name(std::move(n)), init(std::move(i)) {}
};
struct IfStmt : Stmt {
    ExprPtr cond;
    StmtPtr thenBranch, elseBranch; // elseBranch may be null
    IfStmt(ExprPtr c, StmtPtr t, StmtPtr e, SourceLoc l)
        : Stmt(StmtKind::If, l), cond(std::move(c)), thenBranch(std::move(t)), elseBranch(std::move(e)) {}
};
struct WhileStmt : Stmt {
    ExprPtr cond;
    StmtPtr body;
    WhileStmt(ExprPtr c, StmtPtr b, SourceLoc l) : Stmt(StmtKind::While, l), cond(std::move(c)), body(std::move(b)) {}
};
struct ForStmt : Stmt {
    StmtPtr init;   // VarDeclStmt or ExprStmt, may be null
    ExprPtr cond;   // may be null
    ExprPtr step;   // may be null
    StmtPtr body;
    ForStmt(StmtPtr i, ExprPtr c, ExprPtr s, StmtPtr b, SourceLoc l)
        : Stmt(StmtKind::For, l), init(std::move(i)), cond(std::move(c)), step(std::move(s)), body(std::move(b)) {}
};
struct ReturnStmt : Stmt {
    ExprPtr value; // may be null (void return)
    ReturnStmt(ExprPtr v, SourceLoc l) : Stmt(StmtKind::Return, l), value(std::move(v)) {}
};
struct BreakStmt : Stmt { explicit BreakStmt(SourceLoc l) : Stmt(StmtKind::Break, l) {} };
struct ContinueStmt : Stmt { explicit ContinueStmt(SourceLoc l) : Stmt(StmtKind::Continue, l) {} };

// ------------------------------- Declarations -------------------------------

struct Param {
    TypeName declaredType;
    std::string name;
    TypePtr resolvedType;
};

enum class DeclKind { Function, GlobalVar, Struct, Class };

struct Decl {
    DeclKind kind;
    SourceLoc loc;
    virtual ~Decl() = default;
    explicit Decl(DeclKind k, SourceLoc l) : kind(k), loc(l) {}
};
using DeclPtr = std::unique_ptr<Decl>;

struct FunctionDecl : Decl {
    TypeName returnType;
    std::string name;             // for methods: unqualified method name
    std::vector<Param> params;
    StmtPtr body;                 // BlockStmt; null for declarations without a body
    TypePtr resolvedReturnType;

    // Method-specific (set by the parser when parsed inside a class body).
    bool isMethod = false;
    bool isConstructor = false;
    std::string ownerClass;       // class name this method belongs to

    FunctionDecl(TypeName rt, std::string n, std::vector<Param> p, StmtPtr b, SourceLoc l)
        : Decl(DeclKind::Function, l), returnType(std::move(rt)), name(std::move(n)),
          params(std::move(p)), body(std::move(b)) {}
};

struct GlobalVarDecl : Decl {
    TypeName declaredType;
    std::string name;
    ExprPtr init;
    TypePtr resolvedType;
    GlobalVarDecl(TypeName t, std::string n, ExprPtr i, SourceLoc l)
        : Decl(DeclKind::GlobalVar, l), declaredType(std::move(t)), name(std::move(n)), init(std::move(i)) {}
};

struct FieldDecl {
    TypeName declaredType;
    std::string name;
    TypePtr resolvedType;
    int offset = 0; // byte offset within the record, computed by Sema
};

// Struct: plain aggregate, no methods, no inheritance.
struct StructDecl : Decl {
    std::string name;
    std::vector<FieldDecl> fields;
    int size = 0; // computed by Sema
    StructDecl(std::string n, SourceLoc l) : Decl(DeclKind::Struct, l), name(std::move(n)) {}
};

// Class: fields + methods + optional single base class.
struct ClassDecl : Decl {
    std::string name;
    std::string baseName; // empty if no base
    std::vector<FieldDecl> fields;
    std::vector<std::unique_ptr<FunctionDecl>> methods; // includes constructors
    int size = 0; // computed by Sema (includes inherited fields)
    ClassDecl(std::string n, std::string base, SourceLoc l)
        : Decl(DeclKind::Class, l), name(std::move(n)), baseName(std::move(base)) {}
};

struct TranslationUnit {
    std::vector<DeclPtr> decls;
};

} // namespace mcpc
