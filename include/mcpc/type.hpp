// type.hpp - The MiniCPP type system: primitives, pointers, structs/classes.
#pragma once
#include <string>
#include <memory>
#include <vector>

namespace mcpc {

enum class TypeKind { Int, Char, Bool, Void, Pointer, Record /* struct or class */ };

struct Type;
using TypePtr = std::shared_ptr<Type>;

struct Type {
    TypeKind kind;
    TypePtr pointee;        // valid when kind == Pointer
    std::string recordName; // valid when kind == Record

    static TypePtr makeInt()  { return std::make_shared<Type>(Type{TypeKind::Int, nullptr, ""}); }
    static TypePtr makeChar() { return std::make_shared<Type>(Type{TypeKind::Char, nullptr, ""}); }
    static TypePtr makeBool() { return std::make_shared<Type>(Type{TypeKind::Bool, nullptr, ""}); }
    static TypePtr makeVoid() { return std::make_shared<Type>(Type{TypeKind::Void, nullptr, ""}); }
    static TypePtr makePointer(TypePtr to) { return std::make_shared<Type>(Type{TypeKind::Pointer, to, ""}); }
    static TypePtr makeRecord(std::string name) { return std::make_shared<Type>(Type{TypeKind::Record, nullptr, std::move(name)}); }

    bool isInt() const  { return kind == TypeKind::Int; }
    bool isChar() const { return kind == TypeKind::Char; }
    bool isBool() const { return kind == TypeKind::Bool; }
    bool isVoid() const { return kind == TypeKind::Void; }
    bool isPointer() const { return kind == TypeKind::Pointer; }
    bool isRecord() const { return kind == TypeKind::Record; }

    // Every scalar (non-record, non-void) value occupies 8 bytes on the stack
    // in this implementation to keep frame layout simple; records are sized
    // by their field layout (see Sema::layoutRecord).
    bool isScalar() const { return kind != TypeKind::Record && kind != TypeKind::Void; }

    std::string toString() const;
    bool equals(const Type& other) const;
};

std::string typeToString(const TypePtr& t);
bool typesEqual(const TypePtr& a, const TypePtr& b);

} // namespace mcpc
