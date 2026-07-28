// sema.cpp - Semantic analysis implementation.
//
// Pipeline (three passes over the AST, enabling forward references and
// mutual recursion between functions/methods):
//   Pass A: register struct/class signatures, then compute record layouts
//           (field offsets + sizes), resolving embedded-by-value fields
//           recursively so a record's size is known before it's embedded
//           in another record.
//   Pass B: resolve every function/method/global-variable signature (param
//           types, return types) so call sites can be checked regardless
//           of declaration order.
//   Pass C: type-check every function/method body and global initializer.
//
// Object model: struct instances are value types stored inline (like C).
// Class instances are always heap-allocated and accessed through an
// implicit reference (like Java/C#): `new C(...)` yields the reference,
// and `.` on a class-typed value auto-dereferences exactly like `->`.
// This keeps a single, consistent codegen story for member access while
// still letting `struct` behave like a plain C aggregate.
#include "mcpc/sema.hpp"
#include <sstream>
#include <algorithm>

namespace mcpc {

void Sema::error(const std::string& msg, SourceLoc loc) const {
    throw SemaError{msg, loc};
}

void Sema::pushScope() { scopes_.emplace_back(); }
void Sema::popScope() { scopes_.pop_back(); }

void Sema::declareLocal(const std::string& name, TypePtr type, SourceLoc loc) {
    for (auto& lv : scopes_.back()) {
        if (lv.name == name) error("redefinition of '" + name + "'", loc);
    }
    scopes_.back().push_back({name, type});
}

std::optional<TypePtr> Sema::lookupLocal(const std::string& name) const {
    for (auto it = scopes_.rbegin(); it != scopes_.rend(); ++it) {
        for (auto rit = it->rbegin(); rit != it->rend(); ++rit) {
            if (rit->name == name) return rit->type;
        }
    }
    return std::nullopt;
}

const RecordInfo* Sema::findRecord(const std::string& name) const {
    auto it = records_.find(name);
    return it == records_.end() ? nullptr : &it->second;
}

const RecordInfo* Sema::findRecordForType(const TypePtr& t) const {
    if (!t) return nullptr;
    if (t->isRecord()) return findRecord(t->recordName);
    if (t->isPointer() && t->pointee && t->pointee->isRecord()) return findRecord(t->pointee->recordName);
    return nullptr;
}

TypePtr Sema::resolveTypeName(const TypeName& tn, SourceLoc loc) {
    TypePtr base;
    if (tn.baseName == "int") base = Type::makeInt();
    else if (tn.baseName == "char") base = Type::makeChar();
    else if (tn.baseName == "bool") base = Type::makeBool();
    else if (tn.baseName == "void") base = Type::makeVoid();
    else if (records_.count(tn.baseName)) base = Type::makeRecord(tn.baseName);
    else error("unknown type '" + tn.baseName + "'", loc);
    for (int i = 0; i < tn.pointerDepth; i++) base = Type::makePointer(base);
    return base;
}

// ------------------------------- Pass A: records -------------------------------

void Sema::registerRecordSignatures(TranslationUnit& tu) {
    for (auto& d : tu.decls) {
        if (auto* s = dynamic_cast<StructDecl*>(d.get())) {
            RecordInfo info;
            info.name = s->name;
            info.isClass = false;
            records_[s->name] = std::move(info);
        } else if (auto* c = dynamic_cast<ClassDecl*>(d.get())) {
            RecordInfo info;
            info.name = c->name;
            info.isClass = true;
            info.baseName = c->baseName;
            records_[c->name] = std::move(info);
        }
    }
    for (auto& d : tu.decls) {
        auto* c = dynamic_cast<ClassDecl*>(d.get());
        if (!c || c->baseName.empty()) continue;
        if (!records_.count(c->baseName))
            error("class '" + c->name + "' inherits from unknown class '" + c->baseName + "'", c->loc);
        std::string cursor = c->baseName;
        while (!cursor.empty()) {
            if (cursor == c->name) error("inheritance cycle involving class '" + c->name + "'", c->loc);
            cursor = records_[cursor].baseName;
        }
    }
}

void Sema::layoutRecord(const std::string& name) {
    RecordInfo& info = records_.at(name);
    if (laidOut_.count(name)) return;
    if (visiting_.count(name))
        error("recursive by-value embedding of record '" + name + "'", SourceLoc{});
    visiting_.insert(name);

    int offset = 0;
    if (info.isClass && !info.baseName.empty()) {
        layoutRecord(info.baseName);
        RecordInfo& base = records_.at(info.baseName);
        info.fields = base.fields;
        info.methodLabel = base.methodLabel;
        info.methodDecl = base.methodDecl;
        info.ctorLabel = base.ctorLabel;
        info.ctorDecl = base.ctorDecl;
        offset = base.size;
    }

    auto& rawFields = rawFieldsOf_.at(name);
    for (FieldDecl* f : rawFields) {
        f->resolvedType = resolveTypeName(f->declaredType, SourceLoc{});
        int fsize = 8;
        if (f->resolvedType->isRecord()) {
            layoutRecord(f->resolvedType->recordName);
            fsize = records_.at(f->resolvedType->recordName).size;
        }
        f->offset = offset;
        offset += fsize;
        info.fields.push_back(f);
    }
    if (info.isClass && rawMethodsOf_.count(name)) {
        for (FunctionDecl* m : rawMethodsOf_.at(name)) {
            if (m->isConstructor) { info.ctorLabel = name + "_ctor"; info.ctorDecl = m; }
            else {
                std::string label = name + "_" + m->name;
                info.methodLabel[m->name] = label;
                info.methodDecl[m->name] = m;
            }
        }
    }
    info.size = offset;
    visiting_.erase(name);
    laidOut_.insert(name);
}

// -------------------------- Driving pipeline --------------------------

void Sema::registerBuiltins() {
    // print_int, print_char, print_str are provided by the runtime (see
    // runtime/start.s) and exposed here as pre-declared free functions so
    // MiniCPP programs can produce observable output beyond an exit code.
    auto makeBuiltin = [&](const std::string& name, TypeName paramType) {
        TypeName voidRt; voidRt.baseName = "void";
        std::vector<Param> params;
        Param p; p.declaredType = paramType; p.name = "v";
        p.resolvedType = resolveTypeName(p.declaredType, SourceLoc{});
        params.push_back(p);
        auto fn = std::make_unique<FunctionDecl>(voidRt, name, std::move(params), nullptr, SourceLoc{});
        fn->resolvedReturnType = Type::makeVoid();
        FunctionInfo fi; fi.label = name; fi.decl = fn.get(); fi.isMethod = false;
        functions_[name] = fi;
        builtins_.push_back(std::move(fn));
    };
    TypeName intT; intT.baseName = "int";
    TypeName charT; charT.baseName = "char";
    TypeName charPtrT; charPtrT.baseName = "char"; charPtrT.pointerDepth = 1;
    makeBuiltin("print_int", intT);
    makeBuiltin("print_char", charT);
    makeBuiltin("print_str", charPtrT);
}

void Sema::run(TranslationUnit& tu) {
    registerBuiltins();
    for (auto& d : tu.decls) {
        if (auto* s = dynamic_cast<StructDecl*>(d.get())) {
            auto& v = rawFieldsOf_[s->name];
            for (auto& f : s->fields) v.push_back(&f);
        } else if (auto* c = dynamic_cast<ClassDecl*>(d.get())) {
            auto& v = rawFieldsOf_[c->name];
            for (auto& f : c->fields) v.push_back(&f);
            auto& mv = rawMethodsOf_[c->name];
            for (auto& m : c->methods) mv.push_back(m.get());
        }
    }

    registerRecordSignatures(tu);
    std::vector<std::string> names;
    for (auto& [name, info] : records_) { (void)info; names.push_back(name); }
    for (auto& name : names) layoutRecord(name);

    for (auto& d : tu.decls) {
        if (auto* f = dynamic_cast<FunctionDecl*>(d.get())) {
            f->resolvedReturnType = resolveTypeName(f->returnType, f->loc);
            for (auto& p : f->params) p.resolvedType = resolveTypeName(p.declaredType, f->loc);
            if (functions_.count(f->name)) error("redefinition of function '" + f->name + "'", f->loc);
            FunctionInfo fi;
            fi.label = f->name;
            fi.decl = f;
            fi.isMethod = false;
            functions_[f->name] = fi;
        } else if (auto* g = dynamic_cast<GlobalVarDecl*>(d.get())) {
            g->resolvedType = resolveTypeName(g->declaredType, g->loc);
            globals_[g->name] = g;
        }
    }
    for (auto& d : tu.decls) {
        auto* c = dynamic_cast<ClassDecl*>(d.get());
        if (!c) continue;
        for (auto& m : c->methods) {
            m->resolvedReturnType = m->isConstructor ? Type::makeVoid() : resolveTypeName(m->returnType, m->loc);
            for (auto& p : m->params) p.resolvedType = resolveTypeName(p.declaredType, m->loc);
        }
    }

    for (auto& d : tu.decls) {
        if (auto* f = dynamic_cast<FunctionDecl*>(d.get())) {
            if (f->body) checkFunctionBody(*f);
        } else if (auto* c = dynamic_cast<ClassDecl*>(d.get())) {
            for (auto& m : c->methods) {
                if (m->body) checkFunctionBody(*m);
            }
        }
    }

    for (auto& d : tu.decls) {
        auto* g = dynamic_cast<GlobalVarDecl*>(d.get());
        if (!g || !g->init) continue;
        if (g->init->kind != ExprKind::IntLiteral && g->init->kind != ExprKind::CharLiteral &&
            g->init->kind != ExprKind::BoolLiteral) {
            error("global variable initializers must be constant literals in this subset", g->loc);
        }
    }
}

void Sema::checkFunctionBody(FunctionDecl& fn) {
    scopes_.clear();
    pushScope();
    currentReturnType_ = fn.resolvedReturnType;
    if (fn.isMethod) {
        currentThisType_ = Type::makePointer(Type::makeRecord(fn.ownerClass));
        currentOwnerClass_ = fn.ownerClass;
    } else {
        currentThisType_ = nullptr;
        currentOwnerClass_.clear();
    }
    for (auto& p : fn.params) declareLocal(p.name, p.resolvedType, fn.loc);
    checkBlock(static_cast<BlockStmt&>(*fn.body));
    popScope();
}

void Sema::checkBlock(BlockStmt& b) {
    pushScope();
    for (auto& s : b.stmts) checkStmt(*s);
    popScope();
}

void Sema::checkStmt(Stmt& s) {
    switch (s.kind) {
        case StmtKind::Block: checkBlock(static_cast<BlockStmt&>(s)); break;
        case StmtKind::ExprStmt: checkExpr(*static_cast<ExprStmt&>(s).expr); break;
        case StmtKind::VarDecl: {
            auto& vd = static_cast<VarDeclStmt&>(s);
            vd.resolvedType = resolveTypeName(vd.declaredType, vd.loc);
            if (vd.init) checkExpr(*vd.init);
            declareLocal(vd.name, vd.resolvedType, vd.loc);
            break;
        }
        case StmtKind::If: {
            auto& is = static_cast<IfStmt&>(s);
            checkExpr(*is.cond);
            checkStmt(*is.thenBranch);
            if (is.elseBranch) checkStmt(*is.elseBranch);
            break;
        }
        case StmtKind::While: {
            auto& ws = static_cast<WhileStmt&>(s);
            checkExpr(*ws.cond);
            checkStmt(*ws.body);
            break;
        }
        case StmtKind::For: {
            auto& fs = static_cast<ForStmt&>(s);
            pushScope();
            if (fs.init) checkStmt(*fs.init);
            if (fs.cond) checkExpr(*fs.cond);
            if (fs.step) checkExpr(*fs.step);
            checkStmt(*fs.body);
            popScope();
            break;
        }
        case StmtKind::Return: {
            auto& rs = static_cast<ReturnStmt&>(s);
            if (rs.value) checkExpr(*rs.value);
            break;
        }
        case StmtKind::Break:
        case StmtKind::Continue:
            break;
    }
}

TypePtr Sema::checkExpr(Expr& e) {
    switch (e.kind) {
        case ExprKind::IntLiteral: e.type = Type::makeInt(); return e.type;
        case ExprKind::CharLiteral: e.type = Type::makeChar(); return e.type;
        case ExprKind::BoolLiteral: e.type = Type::makeBool(); return e.type;
        case ExprKind::StringLiteral: {
            auto& se = static_cast<StringLiteralExpr&>(e);
            se.labelId = stringCounter_++;
            stringPool_.push_back({"str_" + std::to_string(se.labelId), se.value});
            e.type = Type::makePointer(Type::makeChar());
            return e.type;
        }
        case ExprKind::This: {
            if (!currentThisType_) error("'this' used outside a method", e.loc);
            e.type = currentThisType_;
            return e.type;
        }
        case ExprKind::Identifier: {
            auto& id = static_cast<IdentifierExpr&>(e);
            if (auto lt = lookupLocal(id.name)) { e.type = *lt; return e.type; }
            if (currentThisType_) {
                auto* rec = findRecord(currentOwnerClass_);
                for (auto* f : rec->fields) {
                    if (f->name == id.name) { e.type = f->resolvedType; return e.type; }
                }
            }
            if (globals_.count(id.name)) { e.type = globals_[id.name]->resolvedType; return e.type; }
            error("use of undeclared identifier '" + id.name + "'", e.loc);
        }
        case ExprKind::Binary: {
            auto& b = static_cast<BinaryExpr&>(e);
            auto lt = checkExpr(*b.lhs);
            auto rt = checkExpr(*b.rhs);
            bool cmp = (b.op == "==" || b.op == "!=" || b.op == "<" || b.op == "<=" || b.op == ">" || b.op == ">=");
            bool logic = (b.op == "&&" || b.op == "||");
            if (logic) { e.type = Type::makeBool(); return e.type; }
            if (cmp) { e.type = Type::makeBool(); return e.type; }
            if (lt->isPointer() && rt->isScalar() && !rt->isPointer() && (b.op == "+" || b.op == "-")) {
                e.type = lt; return e.type;
            }
            if (lt->isRecord() || rt->isRecord()) error("record types are not valid in arithmetic expressions", e.loc);
            e.type = Type::makeInt();
            return e.type;
        }
        case ExprKind::Unary: {
            auto& u = static_cast<UnaryExpr&>(e);
            auto t = checkExpr(*u.operand);
            if (u.op == "!") e.type = Type::makeBool();
            else e.type = t;
            return e.type;
        }
        case ExprKind::PostIncDec: {
            auto& p = static_cast<PostIncDecExpr&>(e);
            e.type = checkExpr(*p.operand);
            return e.type;
        }
        case ExprKind::Assign: {
            auto& a = static_cast<AssignExpr&>(e);
            auto tt = checkExprAsLValue(*a.target);
            checkExpr(*a.value);
            e.type = tt;
            return e.type;
        }
        case ExprKind::AddrOf: {
            auto& a = static_cast<AddrOfExpr&>(e);
            auto t = checkExpr(*a.operand);
            e.type = Type::makePointer(t);
            return e.type;
        }
        case ExprKind::Deref: {
            auto& d = static_cast<DerefExpr&>(e);
            auto t = checkExpr(*d.operand);
            if (!t->isPointer()) error("cannot dereference non-pointer type '" + typeToString(t) + "'", e.loc);
            e.type = t->pointee;
            return e.type;
        }
        case ExprKind::Index: {
            auto& ix = static_cast<IndexExpr&>(e);
            auto t = checkExpr(*ix.base);
            checkExpr(*ix.index);
            if (!t->isPointer()) error("cannot index non-pointer type '" + typeToString(t) + "'", e.loc);
            e.type = t->pointee;
            return e.type;
        }
        case ExprKind::Member: {
            auto& m = static_cast<MemberExpr&>(e);
            auto bt = checkExpr(*m.base);
            const RecordInfo* rec = nullptr;
            if (m.arrow) {
                if (!bt->isPointer() || !bt->pointee->isRecord())
                    error("'->' requires a pointer-to-record type", e.loc);
                rec = findRecord(bt->pointee->recordName);
            } else {
                if (bt->isPointer() && bt->pointee && bt->pointee->isRecord()) rec = findRecord(bt->pointee->recordName);
                else if (bt->isRecord()) rec = findRecord(bt->recordName);
                else error("'.' requires a record type", e.loc);
            }
            if (!rec) error("unknown record type in member access", e.loc);
            for (auto* f : rec->fields) {
                if (f->name == m.member) { e.type = f->resolvedType; return e.type; }
            }
            if (rec->methodDecl.count(m.member)) {
                e.type = Type::makeInt(); // only meaningful as a CallExpr callee; see below
                return e.type;
            }
            error("no member named '" + m.member + "' in '" + rec->name + "'", e.loc);
        }
        case ExprKind::Call: {
            auto& c = static_cast<CallExpr&>(e);
            if (auto* me = dynamic_cast<MemberExpr*>(c.callee.get())) {
                auto bt = checkExpr(*me->base);
                const RecordInfo* rec = findRecordForType(bt);
                if (!rec) error("method call on non-record type", e.loc);
                auto it = rec->methodDecl.find(me->member);
                if (it == rec->methodDecl.end()) error("no method named '" + me->member + "' in '" + rec->name + "'", e.loc);
                for (auto& a : c.args) checkExpr(*a);
                e.type = it->second->resolvedReturnType;
                return e.type;
            }
            if (auto* id = dynamic_cast<IdentifierExpr*>(c.callee.get())) {
                auto it = functions_.find(id->name);
                if (it != functions_.end()) {
                    for (auto& a : c.args) checkExpr(*a);
                    e.type = it->second.decl->resolvedReturnType;
                    return e.type;
                }
                // Fall back to an implicit this->name(...) call from inside a method.
                if (currentThisType_) {
                    auto* rec = findRecord(currentOwnerClass_);
                    auto mit = rec->methodDecl.find(id->name);
                    if (mit != rec->methodDecl.end()) {
                        for (auto& a : c.args) checkExpr(*a);
                        e.type = mit->second->resolvedReturnType;
                        return e.type;
                    }
                }
                error("call to undeclared function '" + id->name + "'", e.loc);
            }
            error("unsupported call target", e.loc);
        }
        case ExprKind::New: {
            auto& n = static_cast<NewExpr&>(e);
            auto* rec = findRecord(n.typeName);
            if (!rec || !rec->isClass) error("'new' requires a class type, got '" + n.typeName + "'", e.loc);
            for (auto& a : n.ctorArgs) checkExpr(*a);
            if (rec->ctorDecl && n.ctorArgs.size() != rec->ctorDecl->params.size())
                error("constructor for '" + n.typeName + "' expects " +
                      std::to_string(rec->ctorDecl->params.size()) + " argument(s)", e.loc);
            if (!rec->ctorDecl && !n.ctorArgs.empty())
                error("class '" + n.typeName + "' has no constructor accepting arguments", e.loc);
            e.type = Type::makeRecord(n.typeName);
            return e.type;
        }
    }
    error("internal error: unhandled expression kind", e.loc);
}

TypePtr Sema::checkExprAsLValue(Expr& e) {
    if (e.kind != ExprKind::Identifier && e.kind != ExprKind::Member &&
        e.kind != ExprKind::Deref && e.kind != ExprKind::Index) {
        error("expression is not assignable", e.loc);
    }
    return checkExpr(e);
}

} // namespace mcpc
