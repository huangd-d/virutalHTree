module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'build', // 影响构建系统或外部依赖项的更改（示例范围：gulp, broccoli, npm）
                'chore', // 构建过程或辅助工具的变动（不影响源文件、测试文件）
                'ci', // 对 CI 配置文件和脚本的更改（示例范围：Travis, Circle, BrowserStack, SauceLabs）
                'docs', // 文档相关改动
                'feat', // 新增功能
                'fix', // 修复 bug
                'perf', // 改进性能的代码更改
                'refactor', // 重构代码（既不是新增功能，也不是修改 bug）
                'revert', // 回滚某个之前的提交
                'style', // 不影响代码含义的变化（如空格、格式化、缺少分号等）
                'test' // 添加缺失的测试或修正现有测试
            ]
        ],
        'subject-full-stop': [0], // 主题末尾不需要句号
        'subject-case': [0], // 主题大小写不做限制
        'header-max-length': [2, 'always', 100] // 提交信息头部长度不超过 100 字符
    }
};



