
const ROOT_PATH = process.cwd();
export default
{
    // ----------------------------------------------------
    // 🚀 连接配置 (Connection Configuration)
    // ----------------------------------------------------
    dialect: 'sqlite',
    // 含义: 指定使用的数据库类型/方言 (Dialect)。这里是 SQLite。

    storage: ROOT_PATH + '/database.sqlite',
    // 含义: 仅对 SQLite 生效。指定数据库文件在本地文件系统中的路径。
    // ROOT_PATH 获取当前 Node.js 进程的工作目录，将数据库文件放在项目根目录。

    logging: false,
    // 含义: 禁用 Sequelize 的日志输出。
    // 如果设置为 true 或 console.log，Sequelize 会在控制台打印执行的 SQL 语句。

    // ----------------------------------------------------
    // 💡 模型默认定义 (Global Model Definition Defaults)
    // ----------------------------------------------------
    define: {
        // ✅ 全局默认配置

        timestamps: true,
        // 含义: 是否自动为所有模型添加时间戳字段 (createdAt 和 updatedAt)。
        // true = 启用。

        underscored: true,
        // 含义: 字段名是否使用下划线命名法。
        // true = 将模型属性名从驼峰式 (camelCase) 自动转换为数据库的下划线式 (snake_case)。
        // 例子: 在模型中定义 userEmail，数据库字段为 user_email。

        createdAt : 'created_at',
        // 含义: 指定创建时间字段在数据库中的列名。

        updatedAt : 'updated_at',
        // 含义: 指定更新时间字段在数据库中的列名。

        deletedAt : 'deleted_at',
        // 含义: 指定软删除时间字段在数据库中的列名。
        // 仅在 paranoid: true 时有效。

        paranoid: true,
        // 含义: 偏执模式，即 **软删除 (Soft Delete)** 开关。
        // true = 启用软删除。当调用 Model.destroy() 时，不会真正删除数据，
        // 而是将 deleted_at 字段设置为当前时间。
        // 所有的查询 (findAll, findOne) 都会自动排除 deleted_at 不为 NULL 的记录。
    }
}