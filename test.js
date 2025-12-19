import {getModel} from "#src/lib/ai-client";
import {Chat} from "@lmstudio/sdk";


const model = await getModel()


const chat = Chat.from([
    { role: "user", content: "你好" },
]);


const prediction = model.respond(chat,{});

let thingContent = '思考:\n';
let answerContent = "回复:\n";

/**
 * item 对象的结构详细说明：
 * * {
 * // 1. 本次蹦出来的文字内容。
 * // 可能是个词，也可能是个标点符号，甚至是换行符 \n。
 * content: string,
 * * // 2. 本次片段包含的 Token 数量（数字）。
 * // 你可以把每一轮的这个数字加起来，得到实时的 Token 消耗总数。
 * tokensCount: number,
 * * // 3. 这一段内容的“性质”类型。
 * // "none": 普通回答（直接给用户看的）。
 * // "reasoning": AI 的思考过程（比如 DeepSeek 正在“想”的部分）。
 * reasoningType: "none" | "reasoning" | "reasoningStartTag" | "reasoningEndTag"
 * * // 4. 这段话是不是“草稿”模型生成的（布尔值）。
 * // true 代表这是为了提速由小模型先猜出来的词，false 是主模型确定的。
 * containsDrafted: boolean,
 * * // 5. 结构化标记（目前是实验性字段）。
 * // 官方还没定死用途，通常可以无视，除非你在做非常复杂的 JSON 解析模式。
 * isStructural: boolean
 * }
 */
for await (const item of prediction) {


    if (["reasoning","reasoningStartTag","reasoningEndTag"].includes(item.reasoningType))
    {
        if (item.reasoningType === 'reasoningStartTag')
        {
            thingContent += '<think>'
        }
        thingContent += item.content;
        if (item.reasoningType === 'reasoningEndTag')
        {
            thingContent += '</think>'
        }
    } else {
        answerContent += item.content;
    }


    // // 打印整个结构，对照上面的注释看
    console.log(item);
    //
    // // 实际业务中通常只把文字输出来
     process.stdout.write(item.content);
}

console.log(thingContent);
console.log(answerContent);
// console.info();

// const model = await client.llm.model();


