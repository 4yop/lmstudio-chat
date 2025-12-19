import { LMStudioClient } from "@lmstudio/sdk";
import Config from "#src/config/lm-studio-server";

const lmstudioClient = new LMStudioClient();

// 缓存真正的模型实例
let cachedModelInstance = null;

/**
 *
 * @return {Promise<import("@lmstudio/sdk").LLM>}
 */
export async function getModel() {
    // 如果已经缓存了，直接返回
    if (cachedModelInstance !== null) return cachedModelInstance;

    try {
        // 1. 获取所有已加载模型的列表（元数据）
        const loadedLLMs = await lmstudioClient.llm.listLoaded();

        // 2. 查找是否有匹配配置的模型
        const found = loadedLLMs.find(m => m.identifier === Config.model_id);

        if (found) {
            console.log(`[AI] 发现模型已在内存: ${found.identifier}`);
            // 通过 get() 拿到真正的操作对象并缓存
            cachedModelInstance = found;
        } else {
            // 3. 内存中没有，则执行加载
            console.log(`[AI] 正在加载新模型: ${Config.model_id} ...`);
            cachedModelInstance = await lmstudioClient.llm.load(Config.model_id, {
                verbose: true
            });
        }

        return cachedModelInstance;
    } catch (error) {
        console.error("[AI] 获取或加载模型失败:", error.message);
        throw error;
    }
}

export default {
    AiClient: lmstudioClient,


};