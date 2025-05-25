"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMS = void 0;
var LLMS;
(function (LLMS) {
    LLMS["chat_model"] = "llama3.2";
    LLMS["embedding_model"] = "bge-large:latest";
    LLMS[LLMS["timeout"] = 3600] = "timeout";
})(LLMS || (exports.LLMS = LLMS = {}));
