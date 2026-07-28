// sema.hpp - Semantic analysis: name resolution, type checking, record layout.
#pragma once
#include "mcpc/ast.hpp"
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <vector>
#include <optional>

namespace mcpc {

struct SemaError {
    std::string message;
    SourceLoc loc;
};

// Resolved info about a struct or class, used by both Sema and Codegen.
struct RecordInfo {
    std::string name;
    bool isClass = false;
    std::string baseName; // empty if none (classes only)
    std::vector<FieldDecl*> fields; // pointers into the owning StructDecl/ClassDecl (includes inherited, base-first)
    int size = 0;
    // method name -> mangled label, e.g. "inc" -> "Counter_inc"; includes inherited (base) entries.
    std::unordered_map<std::string, std::string> methodLabel;
    std::unordered_map<std::string, FunctionDecl*> methodDecl;
    std::string ctorLabel; // empty if no user constructor
    FunctionDecl* ctorDecl = nullptr;
};

// Resolved info about a free function or method, used by Codegen.
struct FunctionInfo {
    std::string label;      // assembly label, e.g. "factorial" or "Counter_inc"
    FunctionDecl* decl;
    bool isMethod = false;
    std::string ownerClass;
};

class Sema {
public:
    // Runs full semantic analysis. Throws SemaError on the first unrecoverable
    // problem. On success, all AST type fields and RecordInfo/FunctionInfo
    // tables are populated for Codegen to consume.
    void run(TranslationUnit& tu);

    const std::unordered_map<std::string, RecordInfo>& records() const { return records_; }
    const std::unordered_map<std::string, FunctionInfo>& functions() const { return functions_; }
    const std::vector<std::pair<std::string, std::string>>& stringLiterals() const { return stringPool_; }

private:
    std::unordered_map<std::string, RecordInfo> records_;
    std::unordered_map<std::string, FunctionInfo> functions_;
    std::unordered_map<std::string, GlobalVarDecl*> globals_;
    std::vector<std::pair<std::string, std::string>> stringPool_; // (label, value)
    int stringCounter_ = 0;

    // Raw AST back-references collected up front so layoutRecord() can walk
    // each record's own fields/methods in declaration order.
    std::unordered_map<std::string, std::vector<FieldDecl*>> rawFieldsOf_;
    std::unordered_map<std::string, std::vector<FunctionDecl*>> rawMethodsOf_;
    std::unordered_set<std::string> laidOut_;
    std::unordered_set<std::string> visiting_; // cycle guard for by-value embedding
    std::vector<std::unique_ptr<FunctionDecl>> builtins_; // owns print_int/print_char/print_str decls

    void registerBuiltins();

    // Local scope stack for name resolution within a function body.
    struct LocalVar { std::string name; TypePtr type; };
    std::vector<std::vector<LocalVar>> scopes_;
    TypePtr currentThisType_; // non-null inside a method
    TypePtr currentReturnType_;
    std::string currentOwnerClass_;

    void pushScope();
    void popScope();
    void declareLocal(const std::string& name, TypePtr type, SourceLoc loc);
    std::optional<TypePtr> lookupLocal(const std::string& name) const;

    TypePtr resolveTypeName(const TypeName& tn, SourceLoc loc);
    void registerRecordSignatures(TranslationUnit& tu);
    void layoutRecord(const std::string& name);
    void checkFunctionBody(FunctionDecl& fn);
    void checkStmt(Stmt& s);
    void checkBlock(BlockStmt& b);
    TypePtr checkExpr(Expr& e);
    TypePtr checkExprAsLValue(Expr& e); // same as checkExpr but validates assignability where relevant

    const RecordInfo* findRecord(const std::string& name) const;
    const RecordInfo* findRecordForType(const TypePtr& t) const;

    [[noreturn]] void error(const std::string& msg, SourceLoc loc) const;
};

} // namespace mcpc
