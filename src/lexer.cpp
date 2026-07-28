// lexer.cpp - Implementation of the MiniCPP lexer.
#include "mcpc/lexer.hpp"
#include <unordered_map>
#include <cctype>
#include <stdexcept>

namespace mcpc {

static const std::unordered_map<std::string, TokKind>& keywordTable() {
    static const std::unordered_map<std::string, TokKind> kw = {
        {"int", TokKind::KwInt}, {"char", TokKind::KwChar}, {"bool", TokKind::KwBool},
        {"void", TokKind::KwVoid}, {"struct", TokKind::KwStruct}, {"class", TokKind::KwClass},
        {"public", TokKind::KwPublic}, {"private", TokKind::KwPrivate}, {"protected", TokKind::KwProtected},
        {"if", TokKind::KwIf}, {"else", TokKind::KwElse}, {"while", TokKind::KwWhile},
        {"for", TokKind::KwFor}, {"return", TokKind::KwReturn}, {"break", TokKind::KwBreak},
        {"continue", TokKind::KwContinue}, {"true", TokKind::KwTrue}, {"false", TokKind::KwFalse},
        {"new", TokKind::KwNew}, {"delete", TokKind::KwDelete}, {"this", TokKind::KwThis},
        {"nullptr", TokKind::KwNullptr}, {"sizeof", TokKind::KwSizeof},
    };
    return kw;
}

const char* tokKindName(TokKind k) {
    switch (k) {
        case TokKind::Identifier: return "identifier";
        case TokKind::IntLiteral: return "int-literal";
        case TokKind::CharLiteral: return "char-literal";
        case TokKind::StringLiteral: return "string-literal";
        case TokKind::EndOfFile: return "eof";
        default: return "token";
    }
}

Lexer::Lexer(std::string source, std::string filename)
    : src_(std::move(source)), filename_(std::move(filename)) {}

bool Lexer::atEnd() const { return pos_ >= src_.size(); }

char Lexer::peek(int off) const {
    size_t p = pos_ + off;
    if (p >= src_.size()) return '\0';
    return src_[p];
}

char Lexer::advance() {
    char c = src_[pos_++];
    if (c == '\n') { line_++; col_ = 1; } else { col_++; }
    return c;
}

bool Lexer::match(char expected) {
    if (atEnd() || src_[pos_] != expected) return false;
    advance();
    return true;
}

SourceLoc Lexer::here() const {
    return SourceLoc{filename_, line_, col_};
}

void Lexer::skipWhitespaceAndComments() {
    for (;;) {
        if (atEnd()) return;
        char c = peek();
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') { advance(); continue; }
        if (c == '/' && peek(1) == '/') {
            while (!atEnd() && peek() != '\n') advance();
            continue;
        }
        if (c == '/' && peek(1) == '*') {
            advance(); advance();
            while (!atEnd() && !(peek() == '*' && peek(1) == '/')) advance();
            if (!atEnd()) { advance(); advance(); }
            continue;
        }
        return;
    }
}

Token Lexer::makeToken(TokKind kind, std::string text, int64_t intVal, SourceLoc startLoc) {
    Token t;
    t.kind = kind;
    t.text = std::move(text);
    t.intValue = intVal;
    t.loc = startLoc;
    return t;
}

Token Lexer::lexIdentifierOrKeyword() {
    SourceLoc start = here();
    size_t startPos = pos_;
    while (!atEnd() && (std::isalnum((unsigned char)peek()) || peek() == '_')) advance();
    std::string text = src_.substr(startPos, pos_ - startPos);
    auto& kw = keywordTable();
    auto it = kw.find(text);
    TokKind kind = (it != kw.end()) ? it->second : TokKind::Identifier;
    return makeToken(kind, text, 0, start);
}

Token Lexer::lexNumber() {
    SourceLoc start = here();
    size_t startPos = pos_;
    while (!atEnd() && std::isdigit((unsigned char)peek())) advance();
    std::string text = src_.substr(startPos, pos_ - startPos);
    int64_t val = std::stoll(text);
    return makeToken(TokKind::IntLiteral, text, val, start);
}

Token Lexer::lexCharLiteral() {
    SourceLoc start = here();
    advance(); // consume opening '
    int64_t val = 0;
    if (peek() == '\\') {
        advance();
        char esc = advance();
        switch (esc) {
            case 'n': val = '\n'; break;
            case 't': val = '\t'; break;
            case '0': val = '\0'; break;
            case '\\': val = '\\'; break;
            case '\'': val = '\''; break;
            default: val = esc; break;
        }
    } else {
        val = advance();
    }
    if (peek() == '\'') advance();
    return makeToken(TokKind::CharLiteral, std::string(1, (char)val), val, start);
}

Token Lexer::lexStringLiteral() {
    SourceLoc start = here();
    advance(); // consume opening "
    std::string out;
    while (!atEnd() && peek() != '"') {
        char c = advance();
        if (c == '\\') {
            char esc = advance();
            switch (esc) {
                case 'n': out.push_back('\n'); break;
                case 't': out.push_back('\t'); break;
                case '0': out.push_back('\0'); break;
                case '\\': out.push_back('\\'); break;
                case '"': out.push_back('"'); break;
                default: out.push_back(esc); break;
            }
        } else {
            out.push_back(c);
        }
    }
    if (!atEnd()) advance(); // closing "
    return makeToken(TokKind::StringLiteral, out, 0, start);
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> out;
    for (;;) {
        skipWhitespaceAndComments();
        if (atEnd()) {
            out.push_back(makeToken(TokKind::EndOfFile, "", 0, here()));
            break;
        }
        SourceLoc start = here();
        char c = peek();

        if (std::isalpha((unsigned char)c) || c == '_') { out.push_back(lexIdentifierOrKeyword()); continue; }
        if (std::isdigit((unsigned char)c)) { out.push_back(lexNumber()); continue; }
        if (c == '\'') { out.push_back(lexCharLiteral()); continue; }
        if (c == '"') { out.push_back(lexStringLiteral()); continue; }

        advance(); // consume c, now decide punctuation
        switch (c) {
            case '(': out.push_back(makeToken(TokKind::LParen, "(", 0, start)); break;
            case ')': out.push_back(makeToken(TokKind::RParen, ")", 0, start)); break;
            case '{': out.push_back(makeToken(TokKind::LBrace, "{", 0, start)); break;
            case '}': out.push_back(makeToken(TokKind::RBrace, "}", 0, start)); break;
            case '[': out.push_back(makeToken(TokKind::LBracket, "[", 0, start)); break;
            case ']': out.push_back(makeToken(TokKind::RBracket, "]", 0, start)); break;
            case ';': out.push_back(makeToken(TokKind::Semicolon, ";", 0, start)); break;
            case ',': out.push_back(makeToken(TokKind::Comma, ",", 0, start)); break;
            case ':':
                if (match(':')) out.push_back(makeToken(TokKind::ColonColon, "::", 0, start));
                else out.push_back(makeToken(TokKind::Colon, ":", 0, start));
                break;
            case '.': out.push_back(makeToken(TokKind::Dot, ".", 0, start)); break;
            case '+':
                if (match('+')) out.push_back(makeToken(TokKind::PlusPlus, "++", 0, start));
                else if (match('=')) out.push_back(makeToken(TokKind::PlusAssign, "+=", 0, start));
                else out.push_back(makeToken(TokKind::Plus, "+", 0, start));
                break;
            case '-':
                if (match('>')) out.push_back(makeToken(TokKind::Arrow, "->", 0, start));
                else if (match('-')) out.push_back(makeToken(TokKind::MinusMinus, "--", 0, start));
                else if (match('=')) out.push_back(makeToken(TokKind::MinusAssign, "-=", 0, start));
                else out.push_back(makeToken(TokKind::Minus, "-", 0, start));
                break;
            case '*':
                if (match('=')) out.push_back(makeToken(TokKind::StarAssign, "*=", 0, start));
                else out.push_back(makeToken(TokKind::Star, "*", 0, start));
                break;
            case '/':
                if (match('=')) out.push_back(makeToken(TokKind::SlashAssign, "/=", 0, start));
                else out.push_back(makeToken(TokKind::Slash, "/", 0, start));
                break;
            case '%': out.push_back(makeToken(TokKind::Percent, "%", 0, start)); break;
            case '=':
                if (match('=')) out.push_back(makeToken(TokKind::Eq, "==", 0, start));
                else out.push_back(makeToken(TokKind::Assign, "=", 0, start));
                break;
            case '!':
                if (match('=')) out.push_back(makeToken(TokKind::Ne, "!=", 0, start));
                else out.push_back(makeToken(TokKind::Bang, "!", 0, start));
                break;
            case '<':
                if (match('=')) out.push_back(makeToken(TokKind::Le, "<=", 0, start));
                else if (match('<')) out.push_back(makeToken(TokKind::Shl, "<<", 0, start));
                else out.push_back(makeToken(TokKind::Lt, "<", 0, start));
                break;
            case '>':
                if (match('=')) out.push_back(makeToken(TokKind::Ge, ">=", 0, start));
                else if (match('>')) out.push_back(makeToken(TokKind::Shr, ">>", 0, start));
                else out.push_back(makeToken(TokKind::Gt, ">", 0, start));
                break;
            case '&':
                if (match('&')) out.push_back(makeToken(TokKind::AmpAmp, "&&", 0, start));
                else out.push_back(makeToken(TokKind::Amp, "&", 0, start));
                break;
            case '|':
                if (match('|')) out.push_back(makeToken(TokKind::PipePipe, "||", 0, start));
                else out.push_back(makeToken(TokKind::Pipe, "|", 0, start));
                break;
            case '^': out.push_back(makeToken(TokKind::Caret, "^", 0, start)); break;
            case '~': out.push_back(makeToken(TokKind::Tilde, "~", 0, start)); break;
            default:
                throw LexError{std::string("unexpected character '") + c + "'", start};
        }
    }
    return out;
}

} // namespace mcpc
