// token.hpp - Token kinds and Token struct for the MiniCPP lexer.
#pragma once
#include <string>
#include <cstdint>

namespace mcpc {

// Source location for diagnostics.
struct SourceLoc {
    std::string file;
    int line = 1;
    int col = 1;
};

enum class TokKind {
    // literals / identifiers
    Identifier, IntLiteral, CharLiteral, StringLiteral,

    // keywords
    KwInt, KwChar, KwBool, KwVoid, KwStruct, KwClass, KwPublic, KwPrivate,
    KwProtected, KwIf, KwElse, KwWhile, KwFor, KwReturn, KwBreak, KwContinue,
    KwTrue, KwFalse, KwNew, KwDelete, KwThis, KwNullptr, KwSizeof,

    // punctuation / operators
    LParen, RParen, LBrace, RBrace, LBracket, RBracket,
    Semicolon, Comma, Colon, ColonColon, Dot, Arrow,
    Plus, Minus, Star, Slash, Percent,
    Assign, PlusAssign, MinusAssign, StarAssign, SlashAssign,
    Eq, Ne, Lt, Le, Gt, Ge,
    AmpAmp, PipePipe, Bang,
    Amp, Pipe, Caret, Tilde, Shl, Shr,
    PlusPlus, MinusMinus,

    EndOfFile, Invalid
};

struct Token {
    TokKind kind = TokKind::Invalid;
    std::string text;      // raw lexeme (identifier name, literal text, etc.)
    int64_t intValue = 0;  // for IntLiteral / CharLiteral
    SourceLoc loc;
};

const char* tokKindName(TokKind k);

} // namespace mcpc
