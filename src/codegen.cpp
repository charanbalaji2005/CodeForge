// codegen.cpp - Emits AT&T-syntax x86-64 assembly (System V ABI) for the
// MiniCPP subset. See codegen.hpp for the overall strategy.
//
// Frame convention: every local variable, parameter, and the implicit
// `this` (for methods) get a fixed 8-byte stack slot below %rbp, assigned
// once per function by collectLocals(). All values -- ints, chars, bools,
// pointers, and class references -- are treated uniformly as 8-byte cells,
// which keeps the code generator simple. Plain `struct` values are stored
// inline and addressed directly; `class` instances are always accessed
// through a pointer (see sema.hpp for the object-model rationale).
//
// Known limitation (documented, not hidden): variable shadowing across
// nested blocks is not supported -- re-declaring a name in an inner scope
// aliases the same stack slot as any identically-named outer variable,
// since slot assignment uses a single flat name->offset map per function.
#include "mcpc/codegen.hpp"
#include <stdexcept>

namespace mcpc {

static const char* argRegs[6] = {"%rdi", "%rsi", "%rdx", "%rcx", "%r8", "%r9"};

std::string Codegen::newLabel(const std::string& hint) {
    return "." + hint + "_" + std::to_string(labelCounter_++);
}

int Codegen::sizeOfType(const TypePtr& t) const {
    if (!t) return 8;
    if (t->kind == TypeKind::Void) return 0;
    if (t->kind == TypeKind::Record) {
        auto it = sema_.records().find(t->recordName);
        return it == sema_.records().end() ? 8 : it->second.size;
    }
    return 8;
}

const RecordInfo* Codegen::recordFor(const TypePtr& t) const {
    if (!t) return nullptr;
    if (t->kind == TypeKind::Record) {
        auto it = sema_.records().find(t->recordName);
        return it == sema_.records().end() ? nullptr : &it->second;
    }
    if (t->kind == TypeKind::Pointer && t->pointee && t->pointee->kind == TypeKind::Record) {
        auto it = sema_.records().find(t->pointee->recordName);
        return it == sema_.records().end() ? nullptr : &it->second;
    }
    return nullptr;
}

void Codegen::assignSlot(const std::string& name, int& nextOffset) {
    localOffset_[name] = nextOffset;
    nextOffset -= 8;
}

void Codegen::collectLocals(Stmt& s, int& nextOffset) {
    switch (s.kind) {
        case StmtKind::Block:
            for (auto& st : static_cast<BlockStmt&>(s).stmts) collectLocals(*st, nextOffset);
            break;
        case StmtKind::VarDecl:
            assignSlot(static_cast<VarDeclStmt&>(s).name, nextOffset);
            break;
        case StmtKind::If: {
            auto& is = static_cast<IfStmt&>(s);
            collectLocals(*is.thenBranch, nextOffset);
            if (is.elseBranch) collectLocals(*is.elseBranch, nextOffset);
            break;
        }
        case StmtKind::While:
            collectLocals(*static_cast<WhileStmt&>(s).body, nextOffset);
            break;
        case StmtKind::For: {
            auto& fs = static_cast<ForStmt&>(s);
            if (fs.init) collectLocals(*fs.init, nextOffset);
            collectLocals(*fs.body, nextOffset);
            break;
        }
        default: break;
    }
}

std::string Codegen::generate(TranslationUnit& tu) {
    out_.str("");
    out_ << "\t.text\n";

    for (auto& d : tu.decls) {
        if (auto* f = dynamic_cast<FunctionDecl*>(d.get())) {
            if (f->body) emitFunction(*f, f->name);
        } else if (auto* c = dynamic_cast<ClassDecl*>(d.get())) {
            for (auto& m : c->methods) {
                if (!m->body) continue;
                std::string label = m->isConstructor ? (c->name + "_ctor") : (c->name + "_" + m->name);
                emitFunction(*m, label);
            }
        }
    }

    // Globals.
    out_ << "\t.data\n";
    for (auto& d : tu.decls) {
        auto* g = dynamic_cast<GlobalVarDecl*>(d.get());
        if (!g) continue;
        int64_t val = 0;
        if (g->init) {
            if (g->init->kind == ExprKind::IntLiteral) val = static_cast<IntLiteralExpr*>(g->init.get())->value;
            else if (g->init->kind == ExprKind::CharLiteral) val = static_cast<CharLiteralExpr*>(g->init.get())->value;
            else if (g->init->kind == ExprKind::BoolLiteral) val = static_cast<BoolLiteralExpr*>(g->init.get())->value ? 1 : 0;
        }
        out_ << "\t.globl g_" << g->name << "\n";
        out_ << "g_" << g->name << ":\t.quad " << val << "\n";
    }

    // String pool.
    out_ << "\t.section .rodata\n";
    for (auto& [label, value] : sema_.stringLiterals()) {
        out_ << label << ":\t.asciz \"";
        for (char c : value) {
            if (c == '"') out_ << "\\\"";
            else if (c == '\\') out_ << "\\\\";
            else if (c == '\n') out_ << "\\n";
            else if (c == '\t') out_ << "\\t";
            else out_ << c;
        }
        out_ << "\"\n";
    }
    return out_.str();
}

void Codegen::emitFunction(FunctionDecl& fn, const std::string& label) {
    localOffset_.clear();
    currentIsMethod_ = fn.isMethod;
    currentOwnerClass_ = fn.ownerClass;
    currentOwnerFields_.clear();
    if (fn.isMethod) {
        auto it = sema_.records().find(fn.ownerClass);
        if (it != sema_.records().end()) currentOwnerFields_ = it->second.fields;
    }
    int nextOffset = -8;
    if (fn.isMethod) assignSlot("this", nextOffset);
    for (auto& p : fn.params) assignSlot(p.name, nextOffset);
    if (fn.body) collectLocals(*fn.body, nextOffset);

    frameSize_ = -nextOffset - 8; // nextOffset already points one past last slot
    if (frameSize_ < 0) frameSize_ = 0;
    frameSize_ = (frameSize_ + 15) & ~15; // 16-byte align

    out_ << "\t.globl " << label << "\n";
    out_ << label << ":\n";
    out_ << "\tpush %rbp\n\tmov %rsp, %rbp\n";
    if (frameSize_ > 0) out_ << "\tsub $" << frameSize_ << ", %rsp\n";

    int regIdx = 0;
    if (fn.isMethod) out_ << "\tmov " << argRegs[regIdx++] << ", " << localOffset_["this"] << "(%rbp)\n";
    for (auto& p : fn.params) {
        if (regIdx < 6) out_ << "\tmov " << argRegs[regIdx++] << ", " << localOffset_[p.name] << "(%rbp)\n";
        // Params beyond the 6th register are a documented limitation of this subset.
    }

    if (fn.body) emitBlock(static_cast<BlockStmt&>(*fn.body));

    // Fallback epilogue in case control falls off the end (returns 0 / null).
    out_ << "\tmov $0, %rax\n\tleave\n\tret\n";
}

void Codegen::emitBlock(BlockStmt& b) {
    for (auto& s : b.stmts) emitStmt(*s);
}

void Codegen::emitStmt(Stmt& s) {
    switch (s.kind) {
        case StmtKind::Block: emitBlock(static_cast<BlockStmt&>(s)); break;
        case StmtKind::ExprStmt: emitExpr(*static_cast<ExprStmt&>(s).expr); break;
        case StmtKind::VarDecl: {
            auto& vd = static_cast<VarDeclStmt&>(s);
            if (vd.init) {
                emitExpr(*vd.init);
                out_ << "\tmov %rax, " << localOffset_[vd.name] << "(%rbp)\n";
            }
            break;
        }
        case StmtKind::If: {
            auto& is = static_cast<IfStmt&>(s);
            std::string elseL = newLabel("else");
            std::string endL = newLabel("endif");
            emitExpr(*is.cond);
            out_ << "\tcmp $0, %rax\n\tje " << elseL << "\n";
            emitStmt(*is.thenBranch);
            out_ << "\tjmp " << endL << "\n" << elseL << ":\n";
            if (is.elseBranch) emitStmt(*is.elseBranch);
            out_ << endL << ":\n";
            break;
        }
        case StmtKind::While: {
            auto& ws = static_cast<WhileStmt&>(s);
            std::string startL = newLabel("while_start");
            std::string endL = newLabel("while_end");
            loopLabels_.push_back({startL, endL});
            out_ << startL << ":\n";
            emitExpr(*ws.cond);
            out_ << "\tcmp $0, %rax\n\tje " << endL << "\n";
            emitStmt(*ws.body);
            out_ << "\tjmp " << startL << "\n" << endL << ":\n";
            loopLabels_.pop_back();
            break;
        }
        case StmtKind::For: {
            auto& fs = static_cast<ForStmt&>(s);
            std::string startL = newLabel("for_start");
            std::string stepL = newLabel("for_step");
            std::string endL = newLabel("for_end");
            if (fs.init) emitStmt(*fs.init);
            loopLabels_.push_back({stepL, endL});
            out_ << startL << ":\n";
            if (fs.cond) { emitExpr(*fs.cond); out_ << "\tcmp $0, %rax\n\tje " << endL << "\n"; }
            emitStmt(*fs.body);
            out_ << stepL << ":\n";
            if (fs.step) emitExpr(*fs.step);
            out_ << "\tjmp " << startL << "\n" << endL << ":\n";
            loopLabels_.pop_back();
            break;
        }
        case StmtKind::Return: {
            auto& rs = static_cast<ReturnStmt&>(s);
            if (rs.value) emitExpr(*rs.value);
            else out_ << "\tmov $0, %rax\n";
            out_ << "\tleave\n\tret\n";
            break;
        }
        case StmtKind::Break:
            out_ << "\tjmp " << loopLabels_.back().second << "\n";
            break;
        case StmtKind::Continue:
            out_ << "\tjmp " << loopLabels_.back().first << "\n";
            break;
    }
}

void Codegen::emitAddress(Expr& e) {
    switch (e.kind) {
        case ExprKind::Identifier: {
            auto& id = static_cast<IdentifierExpr&>(e);
            if (localOffset_.count(id.name)) {
                out_ << "\tlea " << localOffset_[id.name] << "(%rbp), %rax\n";
            } else if (currentIsMethod_) {
                // Implicit field of `this`.
                // (Sema guarantees this resolves to a field when not a local.)
                out_ << "\tmov " << localOffset_["this"] << "(%rbp), %rax\n";
                for (auto* f : currentOwnerFields_) {
                    if (f->name == id.name) { if (f->offset != 0) out_ << "\tadd $" << f->offset << ", %rax\n"; return; }
                }
            } else {
                out_ << "\tlea g_" << id.name << "(%rip), %rax\n";
            }
            break;
        }
        case ExprKind::Member: {
            auto& m = static_cast<MemberExpr&>(e);
            const RecordInfo* rec = recordFor(m.base->type);
            bool baseIsPointerLike = m.arrow || (m.base->type && (m.base->type->isPointer() ||
                                       (m.base->type->isRecord() && rec && rec->isClass)));
            if (baseIsPointerLike) {
                emitExpr(*m.base); // pointer value itself
            } else {
                emitAddress(*m.base); // address of inline struct
            }
            if (rec) {
                for (auto* f : rec->fields) {
                    if (f->name == m.member) {
                        if (f->offset != 0) out_ << "\tadd $" << f->offset << ", %rax\n";
                        break;
                    }
                }
            }
            break;
        }
        case ExprKind::Deref:
            emitExpr(*static_cast<DerefExpr&>(e).operand);
            break;
        case ExprKind::Index: {
            auto& ix = static_cast<IndexExpr&>(e);
            emitExpr(*ix.base);
            out_ << "\tpush %rax\n";
            emitExpr(*ix.index);
            int elemSize = sizeOfType(ix.base->type->pointee);
            out_ << "\tmov $" << elemSize << ", %rcx\n\timul %rcx, %rax\n\tmov %rax, %rcx\n\tpop %rax\n\tadd %rcx, %rax\n";
            break;
        }
        default:
            throw std::runtime_error("internal error: expression is not an lvalue in codegen");
    }
}

void Codegen::emitExpr(Expr& e) {
    switch (e.kind) {
        case ExprKind::IntLiteral: out_ << "\tmov $" << static_cast<IntLiteralExpr&>(e).value << ", %rax\n"; break;
        case ExprKind::CharLiteral: out_ << "\tmov $" << static_cast<CharLiteralExpr&>(e).value << ", %rax\n"; break;
        case ExprKind::BoolLiteral: out_ << "\tmov $" << (static_cast<BoolLiteralExpr&>(e).value ? 1 : 0) << ", %rax\n"; break;
        case ExprKind::StringLiteral:
            out_ << "\tlea str_" << static_cast<StringLiteralExpr&>(e).labelId << "(%rip), %rax\n";
            break;
        case ExprKind::This:
            out_ << "\tmov " << localOffset_["this"] << "(%rbp), %rax\n";
            break;
        case ExprKind::Identifier:
        case ExprKind::Member:
        case ExprKind::Deref:
        case ExprKind::Index:
            emitAddress(e);
            out_ << "\tmov (%rax), %rax\n";
            break;
        case ExprKind::AddrOf:
            emitAddress(*static_cast<AddrOfExpr&>(e).operand);
            break;
        case ExprKind::Binary: {
            auto& b = static_cast<BinaryExpr&>(e);
            if (b.op == "&&") {
                std::string falseL = newLabel("and_false"), endL = newLabel("and_end");
                emitExpr(*b.lhs);
                out_ << "\tcmp $0, %rax\n\tje " << falseL << "\n";
                emitExpr(*b.rhs);
                out_ << "\tcmp $0, %rax\n\tje " << falseL << "\n";
                out_ << "\tmov $1, %rax\n\tjmp " << endL << "\n" << falseL << ":\n\tmov $0, %rax\n" << endL << ":\n";
                break;
            }
            if (b.op == "||") {
                std::string trueL = newLabel("or_true"), endL = newLabel("or_end");
                emitExpr(*b.lhs);
                out_ << "\tcmp $0, %rax\n\tjne " << trueL << "\n";
                emitExpr(*b.rhs);
                out_ << "\tcmp $0, %rax\n\tjne " << trueL << "\n";
                out_ << "\tmov $0, %rax\n\tjmp " << endL << "\n" << trueL << ":\n\tmov $1, %rax\n" << endL << ":\n";
                break;
            }
            emitExpr(*b.lhs);
            out_ << "\tpush %rax\n";
            emitExpr(*b.rhs);
            out_ << "\tmov %rax, %rcx\n\tpop %rax\n";
            if (b.lhs->type && b.lhs->type->isPointer() && (b.op == "+" || b.op == "-")) {
                int scale = sizeOfType(b.lhs->type->pointee);
                out_ << "\tpush %rax\n\tmov $" << scale << ", %rax\n\timul %rax, %rcx\n\tpop %rax\n";
            }
            if (b.op == "+") out_ << "\tadd %rcx, %rax\n";
            else if (b.op == "-") out_ << "\tsub %rcx, %rax\n";
            else if (b.op == "*") out_ << "\timul %rcx, %rax\n";
            else if (b.op == "/") out_ << "\tcqo\n\tidiv %rcx\n";
            else if (b.op == "%") out_ << "\tcqo\n\tidiv %rcx\n\tmov %rdx, %rax\n";
            else if (b.op == "==") out_ << "\tcmp %rcx, %rax\n\tsete %al\n\tmovzbq %al, %rax\n";
            else if (b.op == "!=") out_ << "\tcmp %rcx, %rax\n\tsetne %al\n\tmovzbq %al, %rax\n";
            else if (b.op == "<") out_ << "\tcmp %rcx, %rax\n\tsetl %al\n\tmovzbq %al, %rax\n";
            else if (b.op == "<=") out_ << "\tcmp %rcx, %rax\n\tsetle %al\n\tmovzbq %al, %rax\n";
            else if (b.op == ">") out_ << "\tcmp %rcx, %rax\n\tsetg %al\n\tmovzbq %al, %rax\n";
            else if (b.op == ">=") out_ << "\tcmp %rcx, %rax\n\tsetge %al\n\tmovzbq %al, %rax\n";
            break;
        }
        case ExprKind::Unary: {
            auto& u = static_cast<UnaryExpr&>(e);
            if (u.op == "++pre" || u.op == "--pre") {
                emitAddress(*u.operand);
                out_ << "\tpush %rax\n\tmov (%rax), %rax\n";
                out_ << "\t" << (u.op == "++pre" ? "add" : "sub") << " $1, %rax\n";
                out_ << "\tmov %rax, %rcx\n\tpop %rax\n\tmov %rcx, (%rax)\n\tmov %rcx, %rax\n";
                break;
            }
            emitExpr(*u.operand);
            if (u.op == "-") out_ << "\tneg %rax\n";
            else if (u.op == "!") out_ << "\tcmp $0, %rax\n\tsete %al\n\tmovzbq %al, %rax\n";
            else if (u.op == "~") out_ << "\tnot %rax\n";
            break;
        }
        case ExprKind::PostIncDec: {
            auto& p = static_cast<PostIncDecExpr&>(e);
            emitAddress(*p.operand);
            out_ << "\tpush %rax\n\tmov (%rax), %rax\n\tpush %rax\n";
            out_ << "\tmov %rax, %rcx\n\t" << (p.op == "++" ? "add" : "sub") << " $1, %rcx\n";
            out_ << "\tpop %rax\n\tpop %rdx\n\tmov %rcx, (%rdx)\n";
            // result (old value) is already in %rax
            break;
        }
        case ExprKind::Assign: {
            auto& a = static_cast<AssignExpr&>(e);
            if (a.op == "=") {
                emitAddress(*a.target);
                out_ << "\tpush %rax\n";
                emitExpr(*a.value);
                out_ << "\tpop %rcx\n\tmov %rax, (%rcx)\n";
            } else {
                emitAddress(*a.target);
                out_ << "\tpush %rax\n\tmov (%rax), %rax\n\tpush %rax\n";
                emitExpr(*a.value);
                out_ << "\tmov %rax, %rcx\n\tpop %rax\n";
                if (a.op == "+=") out_ << "\tadd %rcx, %rax\n";
                else if (a.op == "-=") out_ << "\tsub %rcx, %rax\n";
                else if (a.op == "*=") out_ << "\timul %rcx, %rax\n";
                else if (a.op == "/=") out_ << "\tcqo\n\tidiv %rcx\n";
                out_ << "\tmov %rax, %rcx\n\tpop %rax\n\tmov %rcx, (%rax)\n\tmov %rcx, %rax\n";
            }
            break;
        }
        case ExprKind::Call: emitCall(static_cast<CallExpr&>(e)); break;
        case ExprKind::New: emitNew(static_cast<NewExpr&>(e)); break;
    }
}

void Codegen::emitCall(CallExpr& c) {
    std::vector<Expr*> argExprs;
    std::string label;
    bool isMethodCall = false;
    Expr* thisExpr = nullptr;

    bool isImplicitThisCall = false;
    if (auto* me = dynamic_cast<MemberExpr*>(c.callee.get())) {
        const RecordInfo* rec = recordFor(me->base->type);
        label = rec->methodLabel.at(me->member);
        isMethodCall = true;
        thisExpr = me->base.get();
    } else if (auto* id = dynamic_cast<IdentifierExpr*>(c.callee.get())) {
        auto it = sema_.functions().find(id->name);
        if (it != sema_.functions().end()) {
            label = id->name;
        } else {
            // Implicit this->name(...) call from inside a method.
            auto rit = sema_.records().find(currentOwnerClass_);
            label = rit->second.methodLabel.at(id->name);
            isMethodCall = true;
            isImplicitThisCall = true;
        }
    }

    int total = (isMethodCall ? 1 : 0) + (int)c.args.size();
    if (isMethodCall) {
        if (isImplicitThisCall) {
            out_ << "\tmov " << localOffset_["this"] << "(%rbp), %rax\n";
        } else {
            bool baseIsClassRef = thisExpr->type && ((thisExpr->type->isRecord()) || thisExpr->type->isPointer());
            if (baseIsClassRef) emitExpr(*thisExpr); else emitAddress(*thisExpr);
        }
        out_ << "\tpush %rax\n";
    }
    for (auto& a : c.args) {
        emitExpr(*a);
        out_ << "\tpush %rax\n";
    }
    for (int i = total - 1; i >= 0 && i < 6; i--) out_ << "\tpop " << argRegs[i] << "\n";
    out_ << "\tcall " << label << "\n";
}

void Codegen::emitNew(NewExpr& n) {
    const RecordInfo* rec = &sema_.records().at(n.typeName);
    out_ << "\tmov $" << rec->size << ", %rdi\n\tcall __mcpc_alloc\n";
    if (rec->ctorDecl) {
        out_ << "\tpush %rax\n"; // saved result
        out_ << "\tpush %rax\n"; // this arg
        for (auto& a : n.ctorArgs) { emitExpr(*a); out_ << "\tpush %rax\n"; }
        int total = 1 + (int)n.ctorArgs.size();
        for (int i = total - 1; i >= 0 && i < 6; i--) out_ << "\tpop " << argRegs[i] << "\n";
        out_ << "\tcall " << rec->ctorLabel << "\n";
        out_ << "\tpop %rax\n";
    }
}

} // namespace mcpc
