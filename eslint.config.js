import pluginJs from "@eslint/js";
import globals from "globals";

export default [
    pluginJs.configs.recommended,

    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                myCustomGlobal: "readonly"
            }
        },
        rules: {
            // 箭头函数使用括号包裹参数
        "arrow-parens": ["error", "always"],
        // 箭头函数前后空格
        "arrow-spacing": ["error", { before: true, after: true }],
        // 函数名和括号之间无空格
        "func-call-spacing": ["error", "never"],
        // 使用严格相等 === 和 !==
        eqeqeq: ["error", "always"],
        // 对象字面量键值对之间的空格
        "key-spacing": ["error", { beforeColon: false, afterColon: true }],
        // 操作符周围有空格
        "space-infix-ops": "error",
        // 一元操作符前后有空格
        "space-unary-ops": ["error", { words: true, nonwords: false }],
        // 关键字前后有空格
        "keyword-spacing": [
            "error",
            {
                before: true,
                after: true,
                overrides: {
                    return: { after: true },
                    throw: { after: true },
                    case: { after: true },
                },
            },
        ],
        // 逗号后面有空格
        "comma-spacing": ["error", { before: false, after: true }],
        // 分号始终存在
        semi: ["error", "always"],
        // 单引号字符串
        quotes: ["error", "double"],
        // 缩进为两个空格
        // indent: ['error', 2],
        // 对象花括号内侧加空格
        "object-curly-spacing": ["error", "always"],
        // 数组方括号内侧不加空格
        "array-bracket-spacing": ["error", "never"],
        // 不允许不必要的分号
        "no-extra-semi": "error",
        // 不允许未使用的变量
        "no-unused-vars": ["error", { vars: "all", args: "after-used", ignoreRestSiblings: false }],
        // 常量应使用 const 声明
        "prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
        }
    }
];
