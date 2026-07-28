// type.cpp - Type printing and structural equality.
#include "mcpc/type.hpp"

namespace mcpc {

std::string Type::toString() const {
    switch (kind) {
        case TypeKind::Int: return "int";
        case TypeKind::Char: return "char";
        case TypeKind::Bool: return "bool";
        case TypeKind::Void: return "void";
        case TypeKind::Pointer: return (pointee ? pointee->toString() : std::string("?")) + "*";
        case TypeKind::Record: return recordName;
    }
    return "?";
}

bool Type::equals(const Type& other) const {
    if (kind != other.kind) return false;
    if (kind == TypeKind::Pointer) {
        if (!pointee || !other.pointee) return pointee == other.pointee;
        return pointee->equals(*other.pointee);
    }
    if (kind == TypeKind::Record) return recordName == other.recordName;
    return true;
}

std::string typeToString(const TypePtr& t) { return t ? t->toString() : "?"; }
bool typesEqual(const TypePtr& a, const TypePtr& b) {
    if (!a || !b) return a == b;
    return a->equals(*b);
}

} // namespace mcpc
