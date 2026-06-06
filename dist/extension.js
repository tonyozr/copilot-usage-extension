"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate,
  formatStatusBarSummary: () => formatStatusBarSummary,
  formatStatusBarTooltip: () => formatStatusBarTooltip
});
module.exports = __toCommonJS(extension_exports);
var import_promises5 = require("node:fs/promises");
var import_node_path6 = require("node:path");
var vscode3 = __toESM(require("vscode"));

// src/core/config.ts
var vscode = __toESM(require("vscode"));
var COPILOT_FILE_LOGGING_SETTING = "github.copilot.chat.agentDebugLog.fileLogging.enabled";
function isCopilotFileLoggingEnabled() {
  return vscode.workspace.getConfiguration().get(COPILOT_FILE_LOGGING_SETTING, false);
}
function readConfig() {
  const config = vscode.workspace.getConfiguration("tonyozrCopilotUsage");
  return {
    dataPath: config.get("dataPath", ""),
    maxFileSizeMb: 200,
    maxScanDepth: 12
  };
}

// src/core/locator.ts
var import_promises = require("node:fs/promises");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
async function locateCopilotDataPaths(extraPath) {
  const home = (0, import_node_os.homedir)();
  const appData = process.env.APPDATA ?? (0, import_node_path.join)(home, "AppData", "Roaming");
  const candidates = [
    (0, import_node_path.join)(home, ".vscode-remote", "data", "User", "globalStorage"),
    (0, import_node_path.join)(home, ".vscode-remote", "data", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, ".vscode-server", "data", "User", "globalStorage"),
    (0, import_node_path.join)(home, ".vscode-server", "data", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, ".vscode-server-insiders", "data", "User", "globalStorage"),
    (0, import_node_path.join)(home, ".vscode-server-insiders", "data", "User", "workspaceStorage"),
    (0, import_node_path.join)(appData, "Code", "User", "globalStorage"),
    (0, import_node_path.join)(appData, "Code", "User", "workspaceStorage"),
    (0, import_node_path.join)(appData, "Code - Insiders", "User", "globalStorage"),
    (0, import_node_path.join)(appData, "Code - Insiders", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, ".config", "Code", "User", "globalStorage"),
    (0, import_node_path.join)(home, ".config", "Code", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, ".config", "Code - Insiders", "User", "globalStorage"),
    (0, import_node_path.join)(home, ".config", "Code - Insiders", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, "Library", "Application Support", "Code", "User", "globalStorage"),
    (0, import_node_path.join)(home, "Library", "Application Support", "Code", "User", "workspaceStorage"),
    (0, import_node_path.join)(home, "Library", "Application Support", "Code - Insiders", "User", "globalStorage"),
    (0, import_node_path.join)(home, "Library", "Application Support", "Code - Insiders", "User", "workspaceStorage")
  ];
  const trimmedExtraPath = extraPath.trim();
  if (trimmedExtraPath) {
    candidates.unshift(trimmedExtraPath);
  }
  const existingPaths = [];
  for (const candidate of [...new Set(candidates)]) {
    try {
      await (0, import_promises.access)(candidate);
      existingPaths.push(candidate);
    } catch {
    }
  }
  return existingPaths;
}

// src/core/scanner.ts
var import_promises2 = require("node:fs/promises");
var import_node_path2 = require("node:path");
var SUPPORTED_EXTENSIONS = /* @__PURE__ */ new Set([".json", ".jsonl"]);
var WATCH_FOLDER_NAMES = /* @__PURE__ */ new Set(["github.copilot-chat", "debug-logs", "transcripts", "chatsessions", "emptywindowchatsessions"]);
var IGNORED_USAGE_CACHE_FILE_NAMES = /* @__PURE__ */ new Set(["settingembeddings.json", "commandembeddings.json"]);
async function scanUsageFiles(roots, options) {
  const files = [];
  const watchFolders = /* @__PURE__ */ new Set();
  const diagnostics = createDiagnostics();
  const broadRoots = new Set(uniqueResolvedPaths(options.broadRootPaths ?? []));
  const includeFilesOutsideUsageFolders = options.includeFilesOutsideUsageFolders ?? true;
  async function scanFolder(folder, depth, insideUsageFolder, broadRoot) {
    if (depth > options.maxDepth) {
      diagnostics.skippedFolders += 1;
      return;
    }
    let entries;
    try {
      entries = await (0, import_promises2.readdir)(folder, { withFileTypes: true });
    } catch {
      diagnostics.unreadableFiles += 1;
      return;
    }
    for (const entry of entries) {
      const path = (0, import_node_path2.join)(folder, entry.name);
      if (entry.isDirectory()) {
        const isUsageFolder = WATCH_FOLDER_NAMES.has(entry.name.toLowerCase());
        if (isUsageFolder) {
          watchFolders.add(path);
        }
        await scanFolder(path, depth + 1, insideUsageFolder || isUsageFolder, broadRoot);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!broadRoot && !includeFilesOutsideUsageFolders && !insideUsageFolder) {
        continue;
      }
      if (isIgnoredUsageCacheFile(entry.name)) {
        continue;
      }
      if (!isSupportedUsageFile(entry.name)) {
        diagnostics.unsupportedFiles += 1;
        continue;
      }
      let fileStat;
      try {
        fileStat = await (0, import_promises2.stat)(path);
      } catch {
        diagnostics.unreadableFiles += 1;
        continue;
      }
      if (fileStat.size > options.maxFileSizeBytes) {
        diagnostics.oversizedFiles += 1;
        continue;
      }
      diagnostics.scannedFiles += 1;
      files.push(path);
    }
  }
  for (const root of uniqueResolvedPaths(roots)) {
    const broadRoot = [...broadRoots].some((broadRootPath) => isSameOrInsidePath(root, broadRootPath));
    await scanFolder(root, 0, pathContainsUsageFolder(root), broadRoot);
  }
  return { files, watchFolders: Array.from(watchFolders), diagnostics };
}
function createDiagnostics() {
  return {
    scannedFiles: 0,
    skippedFolders: 0,
    unsupportedFiles: 0,
    oversizedFiles: 0,
    unreadableFiles: 0
  };
}
function isSupportedUsageFile(fileName) {
  return SUPPORTED_EXTENSIONS.has((0, import_node_path2.extname)(fileName).toLowerCase());
}
function isIgnoredUsageCacheFile(filePath) {
  return IGNORED_USAGE_CACHE_FILE_NAMES.has((0, import_node_path2.basename)(filePath).toLowerCase());
}
function uniqueResolvedPaths(paths) {
  return [...new Set(paths.map((path) => (0, import_node_path2.resolve)(path)))];
}
function isSameOrInsidePath(path, root) {
  const resolvedPath = (0, import_node_path2.resolve)(path).toLowerCase();
  const resolvedRoot = (0, import_node_path2.resolve)(root).toLowerCase();
  const rootPrefix = resolvedRoot.endsWith(import_node_path2.sep) ? resolvedRoot : `${resolvedRoot}${import_node_path2.sep}`;
  return resolvedPath === resolvedRoot || resolvedPath.startsWith(rootPrefix);
}
function pathContainsUsageFolder(path) {
  return (0, import_node_path2.resolve)(path).split(/[\\/]+/).some((segment) => WATCH_FOLDER_NAMES.has(segment.toLowerCase()));
}

// src/core/usageIndex.ts
var import_promises4 = require("node:fs/promises");
var import_node_path5 = require("node:path");

// src/core/aggregator.ts
function aggregateUsage(records, now = /* @__PURE__ */ new Date()) {
  const today = emptyTotal();
  const week = emptyTotal();
  const month = emptyTotal();
  const allTime = emptyTotal();
  const titleCandidates = /* @__PURE__ */ new Map();
  const visibleRecords = [];
  for (const record of records) {
    if (record.hiddenFromExplorer === true) {
      continue;
    }
    if (record.metadataOnly === true) {
      collectTitleCandidate(titleCandidates, record);
      continue;
    }
    if (!hasPositiveAiCredits(record)) {
      continue;
    }
    const tokens = record.tokens.total;
    const cost = estimateRecordCost(record);
    addToTotal(allTime, tokens, cost);
    if (isSameLocalDay(record.timestamp, now)) {
      addToTotal(today, tokens, cost);
    }
    if (isSameLocalWeek(record.timestamp, now)) {
      addToTotal(week, tokens, cost);
    }
    if (isSameLocalMonth(record.timestamp, now)) {
      addToTotal(month, tokens, cost);
    }
    collectTitleCandidate(titleCandidates, record);
    visibleRecords.push(record);
  }
  const sortedChats = buildChatSummaries(visibleRecords, titleCandidates).sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  const todayChats = buildChatSummaries(
    visibleRecords.filter((record) => isSameLocalDay(record.timestamp, now)),
    titleCandidates
  );
  return {
    today,
    week,
    month,
    allTime,
    chats: sortedChats,
    topModels: buildTopModels(records),
    highestSessionToday: [...todayChats].sort(compareChatsByTokens)[0],
    mostExpensiveSessionToday: [...todayChats].sort(compareChatsByCost)[0]
  };
}
function buildChatSummaries(records, titleCandidates) {
  const chats = /* @__PURE__ */ new Map();
  for (const record of records) {
    const title = resolveTitle(record, titleCandidates.get(record.chatId));
    const cost = estimateRecordCost(record);
    const existing = chats.get(record.chatId);
    if (existing) {
      existing.tokens += record.tokens.total;
      addCost(existing.githubCopilot, cost);
      existing.records.push(record);
      if (record.timestamp > existing.timestamp) {
        existing.title = title;
        existing.model = record.model;
        existing.timestamp = record.timestamp;
      }
    } else {
      const chat = {
        chatId: record.chatId,
        title,
        model: record.model,
        timestamp: record.timestamp,
        tokens: record.tokens.total,
        githubCopilot: emptyCostEstimate(),
        records: [record]
      };
      addCost(chat.githubCopilot, cost);
      chats.set(record.chatId, chat);
    }
  }
  return Array.from(chats.values()).map((chat) => ({
    ...chat,
    records: chat.records.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
  }));
}
function compareChatsByTokens(left, right) {
  return right.tokens - left.tokens || right.timestamp.getTime() - left.timestamp.getTime();
}
function compareChatsByCost(left, right) {
  return right.githubCopilot.aiCredits - left.githubCopilot.aiCredits || right.tokens - left.tokens || right.timestamp.getTime() - left.timestamp.getTime();
}
function buildTopModels(records) {
  const models = /* @__PURE__ */ new Map();
  for (const record of records) {
    if (record.hiddenFromExplorer === true || record.metadataOnly === true || !hasPositiveAiCredits(record) || record.tokens.total <= 0 || record.tokens.source === "missing") {
      continue;
    }
    let model = models.get(record.model);
    if (!model) {
      model = { chatIds: /* @__PURE__ */ new Set(), tokens: 0, githubCopilot: emptyCostEstimate() };
      models.set(record.model, model);
    }
    model.tokens += record.tokens.total;
    model.chatIds.add(record.chatId);
    addCost(model.githubCopilot, estimateRecordCost(record));
  }
  return Array.from(models.entries()).map(([model, usage]) => ({
    model,
    sessions: usage.chatIds.size,
    tokens: usage.tokens,
    githubCopilot: usage.githubCopilot
  })).sort((left, right) => right.tokens - left.tokens).slice(0, 3);
}
function emptyTotal() {
  return {
    tokens: 0,
    githubCopilot: emptyCostEstimate()
  };
}
function emptyCostEstimate() {
  return {
    available: false,
    usd: 0,
    aiCredits: 0
  };
}
function estimateRecordCost(record) {
  const aiCredits = record.billing?.aiCredits ?? 0;
  return {
    available: aiCredits > 0,
    usd: roundUsd(aiCredits * 0.01),
    aiCredits
  };
}
function hasPositiveAiCredits(record) {
  return (record.billing?.aiCredits ?? 0) > 0;
}
function addToTotal(total, tokens, cost) {
  total.tokens += tokens;
  addCost(total.githubCopilot, cost);
}
function addCost(target, addition) {
  target.usd = roundUsd(target.usd + addition.usd);
  target.aiCredits += addition.aiCredits;
  target.available ||= addition.available;
}
function roundUsd(value) {
  return Number(value.toFixed(10));
}
function collectTitleCandidate(candidates, record) {
  const candidate = {
    title: record.title,
    priority: record.titlePriority ?? 1,
    timestamp: record.timestamp
  };
  const existing = candidates.get(record.chatId);
  if (!existing || isBetterTitleCandidate(candidate, existing)) {
    candidates.set(record.chatId, candidate);
  }
}
function isBetterTitleCandidate(candidate, existing) {
  if (candidate.priority !== existing.priority) {
    return candidate.priority > existing.priority;
  }
  if (candidate.priority === 2) {
    return candidate.timestamp < existing.timestamp;
  }
  return candidate.timestamp > existing.timestamp;
}
function resolveTitle(record, candidate) {
  const title = candidate?.title ?? record.title;
  if (isGenericTitle(title)) {
    return record.chatId || title;
  }
  return title;
}
function isGenericTitle(title) {
  const normalized = title.trim().toLowerCase();
  return normalized === "" || normalized === "panel/editagent" || normalized === "copilot debug request";
}
function isSameLocalDay(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
function isSameLocalMonth(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}
function startOfLocalWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}
function isSameLocalWeek(left, right) {
  const leftStart = startOfLocalWeek(left);
  const rightStart = startOfLocalWeek(right);
  return leftStart.getTime() === rightStart.getTime();
}

// src/core/normalizer.ts
var import_node_path3 = require("node:path");
var TITLE_PRIORITY_GENERATED = 4;
var TITLE_PRIORITY_CUSTOM = 5;
var TITLE_PRIORITY_PROMPT = 2;
var TITLE_PRIORITY_RECORD = 1;
var TITLE_PRIORITY_GENERIC = 0;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return void 0;
}
function readNumber(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      return value;
    }
  }
  return void 0;
}
function readBilling(record) {
  const nanoAiu = readNumber(record, ["copilotUsageNanoAiu"]);
  return nanoAiu === void 0 || nanoAiu <= 0 ? void 0 : {
    aiCredits: nanoAiu / 1e9,
    source: "copilot-debug-log"
  };
}
function readNestedRecord(record, key) {
  const value = record[key];
  return isRecord(value) ? value : void 0;
}
function readTimestampValue(value) {
  if (typeof value === "string") {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? void 0 : timestamp;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? void 0 : timestamp;
  }
  return void 0;
}
function readTimestamp(record) {
  for (const key of ["timestamp", "createdAt", "creationDate", "date", "time", "ts"]) {
    const timestamp = readTimestampValue(record[key]);
    if (timestamp !== void 0) {
      return timestamp;
    }
  }
  return /* @__PURE__ */ new Date(0);
}
function readTimestampFromRecords(records) {
  for (const record of records) {
    if (!record) {
      continue;
    }
    const timestamp = readTimestamp(record);
    if (timestamp.getTime() !== 0) {
      return timestamp;
    }
  }
  return /* @__PURE__ */ new Date(0);
}
function buildTokenUsage(input, output, cachedInput = 0, cacheWriteInput = 0, source, total) {
  return {
    input,
    cachedInput,
    output,
    cacheWriteInput,
    total: total ?? input + output,
    source
  };
}
function subtractCachedTokens(input, output, cached) {
  const cachedTokens = cached ?? 0;
  const effectiveInput = Math.max(0, input - cachedTokens);
  const remainingCached = Math.max(0, cachedTokens - input);
  const effectiveOutput = Math.max(0, output - remainingCached);
  return {
    input: effectiveInput,
    output: effectiveOutput,
    total: effectiveInput + effectiveOutput
  };
}
function isTitleGenerationName(name) {
  if (name === void 0) {
    return false;
  }
  const normalized = name.trim().toLowerCase();
  return normalized === "title" || normalized === "generate title" || normalized === "chat title";
}
function isGenericDebugName(name) {
  if (name === void 0) {
    return true;
  }
  const normalized = name.trim().toLowerCase();
  return normalized === "" || normalized === "panel/editagent" || normalized === "copilot debug request";
}
function compactTitle(value, maxLength = 64) {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length === 0) {
    return void 0;
  }
  if (compacted.length <= maxLength) {
    return compacted;
  }
  return `${compacted.slice(0, maxLength - 3).trimEnd()}...`;
}
function chatIdFromFilePath(filePath) {
  const name = (0, import_node_path3.basename)(filePath).replace(/\.[^.]+$/, "");
  return name.length > 0 ? name : void 0;
}
function parentDebugSessionIdFromTitleFile(filePath) {
  if (!(0, import_node_path3.basename)(filePath).toLowerCase().startsWith("title-")) {
    return void 0;
  }
  const parent = (0, import_node_path3.basename)((0, import_node_path3.dirname)(filePath));
  return parent.length > 0 ? parent : void 0;
}
function parseAssistantResponseTitle(response) {
  try {
    const parsed = JSON.parse(response);
    if (!Array.isArray(parsed)) {
      return void 0;
    }
    for (const message of parsed) {
      if (!isRecord(message) || message.role !== "assistant" || !Array.isArray(message.parts)) {
        continue;
      }
      for (const part of message.parts) {
        if (!isRecord(part) || part.type !== "text" || typeof part.content !== "string") {
          continue;
        }
        const title = compactTitle(part.content);
        if (title !== void 0) {
          return title;
        }
      }
    }
  } catch {
    return void 0;
  }
  return void 0;
}
function buildUsageRecord(item, values) {
  return {
    ...values,
    filePath: item.filePath
  };
}
function buildTitleMetadataRecord(item, chatId, title, timestamp, titlePriority) {
  return buildUsageRecord(item, {
    chatId,
    title,
    timestamp,
    model: "unknown",
    metadataOnly: true,
    titlePriority,
    tokens: buildTokenUsage(0, 0, 0, 0, "missing")
  });
}
function normalizeCopilotGeneratedTitleRecord(item, value) {
  if (value.type !== "agent_response") {
    return [];
  }
  const chatId = parentDebugSessionIdFromTitleFile(item.filePath);
  const attrs = readNestedRecord(value, "attrs");
  const response = attrs ? readString(attrs, ["response"]) : void 0;
  const title = response ? parseAssistantResponseTitle(response) : void 0;
  if (chatId === void 0 || title === void 0) {
    return [];
  }
  return [buildTitleMetadataRecord(item, chatId, title, readTimestamp(value), TITLE_PRIORITY_GENERATED)];
}
function normalizeCopilotChatSessionTitleRecord(item, value) {
  if (value.kind === 0) {
    const session = readNestedRecord(value, "v");
    const title = session ? readString(session, ["customTitle"]) : void 0;
    const chatId = session ? readString(session, ["sessionId"]) : void 0;
    if (title !== void 0 && chatId !== void 0) {
      return [
        buildTitleMetadataRecord(
          item,
          chatId,
          title,
          readTimestampFromRecords([session, value]),
          TITLE_PRIORITY_CUSTOM
        )
      ];
    }
  }
  if (value.kind === 1 && Array.isArray(value.k) && value.k.includes("customTitle")) {
    const chatId = chatIdFromFilePath(item.filePath);
    const title = typeof value.v === "string" ? compactTitle(value.v) : void 0;
    if (chatId !== void 0 && title !== void 0) {
      return [buildTitleMetadataRecord(item, chatId, title, readTimestamp(value), TITLE_PRIORITY_CUSTOM)];
    }
  }
  return [];
}
function normalizeCopilotTranscriptUserMessage(item, value) {
  if (value.type !== "user.message") {
    return [];
  }
  const data = readNestedRecord(value, "data");
  const content = data ? readString(data, ["content"]) : void 0;
  const title = content ? compactTitle(content) : void 0;
  const chatId = chatIdFromFilePath(item.filePath);
  if (chatId === void 0 || title === void 0) {
    return [];
  }
  return [buildTitleMetadataRecord(item, chatId, title, readTimestamp(value), TITLE_PRIORITY_PROMPT)];
}
function normalizeCopilotDebugLogRecord(item, value) {
  if (value.type !== "llm_request") {
    return [];
  }
  const attrs = readNestedRecord(value, "attrs");
  if (attrs === void 0) {
    return [];
  }
  const billing = readBilling(attrs);
  if (billing === void 0) {
    return [];
  }
  const input = readNumber(attrs, ["inputTokens", "input_tokens"]);
  const output = readNumber(attrs, ["outputTokens", "output_tokens"]);
  if (input === void 0 && output === void 0) {
    return [];
  }
  const cachedInput = readNumber(attrs, ["cachedTokens", "cached_tokens"]) ?? 0;
  const cacheWriteInput = readNumber(attrs, [
    "cacheWriteInputTokens",
    "cache_write_input_tokens",
    "cacheCreationInputTokens",
    "cache_creation_input_tokens"
  ]) ?? 0;
  const tokens = subtractCachedTokens(input ?? 0, output ?? 0, cachedInput);
  const timestamp = readTimestamp(value);
  const chatId = readString(value, ["sid", "sessionId"]) ?? readString(attrs, ["sessionId", "responseId"]) ?? `${item.filePath}:${timestamp.toISOString()}`;
  const debugName = readString(attrs, ["debugName"]);
  return [
    buildUsageRecord(item, {
      chatId,
      title: debugName ?? "Copilot debug request",
      timestamp,
      model: readString(attrs, ["model"]) ?? "unknown",
      hiddenFromExplorer: isTitleGenerationName(debugName),
      titlePriority: isGenericDebugName(debugName) ? TITLE_PRIORITY_GENERIC : TITLE_PRIORITY_RECORD,
      tokens: buildTokenUsage(tokens.input, tokens.output, cachedInput, cacheWriteInput, "recorded", tokens.total),
      billing
    })
  ];
}
function normalizeRawUsage(item) {
  if (!isRecord(item.value)) {
    return [];
  }
  const value = item.value;
  const generatedTitleRecords = normalizeCopilotGeneratedTitleRecord(item, value);
  if (generatedTitleRecords.length > 0) {
    return generatedTitleRecords;
  }
  const chatSessionTitleRecords = normalizeCopilotChatSessionTitleRecord(item, value);
  if (chatSessionTitleRecords.length > 0) {
    return chatSessionTitleRecords;
  }
  const transcriptTitleRecords = normalizeCopilotTranscriptUserMessage(item, value);
  if (transcriptTitleRecords.length > 0) {
    return transcriptTitleRecords;
  }
  const debugLogRecords = normalizeCopilotDebugLogRecord(item, value);
  if (debugLogRecords.length > 0) {
    return debugLogRecords;
  }
  return [];
}

// src/core/parser.ts
var import_promises3 = require("node:fs/promises");
var import_node_path4 = require("node:path");
var AI_CREDIT_MARKER = '"copilotUsageNanoAiu"';
var MARKER_SCAN_CHUNK_BYTES = 4096;
var jsonArrayContainerKeys = ["records", "items", "requests", "turns", "chats"];
function itemsFromArray(values, filePath) {
  return values.map((value) => ({ value, filePath }));
}
async function parseUsageFile(filePath, options) {
  if (options.mode === "billed-usage" && !await fileContainsText(filePath, AI_CREDIT_MARKER)) {
    return { items: [], malformedRecords: 0 };
  }
  const content = await (0, import_promises3.readFile)(filePath, "utf8");
  const extension = (0, import_node_path4.extname)(filePath).toLowerCase();
  if (extension === ".jsonl") {
    return parseJsonlContent(content, filePath);
  }
  if (extension === ".json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return { items: itemsFromArray(parsed, filePath), malformedRecords: 0 };
    }
    if (parsed !== null && typeof parsed === "object") {
      for (const key of jsonArrayContainerKeys) {
        const value = parsed[key];
        if (Array.isArray(value)) {
          return { items: itemsFromArray(value, filePath), malformedRecords: 0 };
        }
      }
    }
    return { items: [{ value: parsed, filePath }], malformedRecords: 0 };
  }
  return { items: [], malformedRecords: 0 };
}
async function fileContainsText(filePath, needle) {
  if (needle.length === 0) {
    return true;
  }
  const file = await (0, import_promises3.open)(filePath, "r");
  try {
    const buffer = Buffer.alloc(MARKER_SCAN_CHUNK_BYTES);
    let carry = "";
    while (true) {
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) {
        return false;
      }
      const content = carry + buffer.subarray(0, bytesRead).toString("utf8");
      if (content.includes(needle)) {
        return true;
      }
      carry = content.slice(Math.max(0, content.length - needle.length + 1));
    }
  } finally {
    await file.close();
  }
}
function parseJsonlContent(content, filePath) {
  const items = [];
  let malformedRecords = 0;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      items.push({ value: JSON.parse(trimmed), filePath });
    } catch {
      malformedRecords += 1;
    }
  }
  return { items, malformedRecords };
}
function parseCompleteJsonlLines(content, filePath) {
  const lastNewline = Math.max(content.lastIndexOf("\n"), content.lastIndexOf("\r"));
  if (lastNewline === -1) {
    return { items: [], malformedRecords: 0, consumedBytes: 0 };
  }
  const completeContent = content.slice(0, lastNewline + 1);
  const parsed = parseJsonlContent(completeContent, filePath);
  return {
    ...parsed,
    consumedBytes: Buffer.byteLength(completeContent, "utf8")
  };
}

// src/core/usageIndex.ts
var MAX_CONCURRENT_FILE_PARSES = 8;
var UsageIndex = class {
  files = /* @__PURE__ */ new Map();
  roots = [];
  watchFolders = [];
  scanDiagnostics = emptyScanDiagnostics();
  recordsCache;
  recordsVersion = 0;
  summaryCache;
  async rebuild(options) {
    this.files.clear();
    this.invalidateCaches();
    this.roots = uniqueResolvedPaths(options.roots);
    const scan = await scanUsageFiles(this.roots, {
      maxFileSizeBytes: options.config.maxFileSizeMb * 1024 * 1024,
      maxDepth: options.config.maxScanDepth,
      broadRootPaths: customDataRoots(options.config),
      includeFilesOutsideUsageFolders: false
    });
    this.scanDiagnostics = scan.diagnostics;
    this.watchFolders = scan.watchFolders.map((folder) => (0, import_node_path5.resolve)(folder));
    const billedUsageFiles = scan.files.filter((file) => !isMetadataPath(file));
    await forEachLimited(
      billedUsageFiles,
      MAX_CONCURRENT_FILE_PARSES,
      (file) => this.reparseFile(file, { mode: "billed-usage", keepEmpty: false })
    );
    await this.reparseMetadataFiles(scan.files, this.getBilledChatIds());
    return this.summarize(options);
  }
  async applyChanges(options) {
    const previousBilledChatIds = this.getBilledChatIds();
    for (const path of options.pathsToDelete) {
      await this.deletePathState(path);
    }
    for (const path of options.pathsToUpdate) {
      await this.updatePathState(path, options.config);
    }
    const nextBilledChatIds = this.getBilledChatIds();
    this.pruneMetadataForBilledChats(nextBilledChatIds);
    if (hasNewChatIds(previousBilledChatIds, nextBilledChatIds)) {
      await this.refreshMetadataForBilledChats(options.config);
    }
    return this.summarize(options);
  }
  summarize(options) {
    const now = options.now ?? /* @__PURE__ */ new Date();
    const localDateKey = formatLocalDateKey(now);
    if (this.summaryCache?.recordsVersion === this.recordsVersion && this.summaryCache.localDateKey === localDateKey) {
      return this.summaryCache.result;
    }
    const records = this.getRecords();
    const result = {
      summary: aggregateUsage(records, now),
      diagnostics: this.buildDiagnostics()
    };
    this.summaryCache = {
      recordsVersion: this.recordsVersion,
      localDateKey,
      result
    };
    return result;
  }
  getWatchFolders() {
    const folders = /* @__PURE__ */ new Set([...this.roots, ...this.watchFolders]);
    for (const state of this.files.values()) {
      folders.add((0, import_node_path5.dirname)(state.filePath));
    }
    return pruneNestedFolders(Array.from(folders));
  }
  async updateFileState(filePath, config) {
    const resolvedPath = (0, import_node_path5.resolve)(filePath);
    const stateKey = await fileStateKey(resolvedPath);
    if (isIgnoredUsageCacheFile(resolvedPath) || !isSupportedUsageFile(resolvedPath)) {
      if (this.files.delete(stateKey)) {
        this.invalidateCaches();
      }
      return;
    }
    const maxFileSizeBytes = config.maxFileSizeMb * 1024 * 1024;
    let fileStat;
    try {
      fileStat = await (0, import_promises4.stat)(resolvedPath);
    } catch {
      if (this.files.delete(stateKey)) {
        this.invalidateCaches();
      }
      return;
    }
    if (!fileStat.isFile() || fileStat.size > maxFileSizeBytes) {
      if (this.files.delete(stateKey)) {
        this.invalidateCaches();
      }
      return;
    }
    const extension = (0, import_node_path5.extname)(resolvedPath).toLowerCase();
    const existing = this.files.get(stateKey);
    const billedChatIds = this.getBilledChatIds();
    const metadataChatId = metadataChatIdFromPath(resolvedPath, billedChatIds);
    if (isMetadataPath(resolvedPath) && metadataChatId === void 0) {
      if (this.files.delete(stateKey)) {
        this.invalidateCaches();
      }
      return;
    }
    const mode = metadataChatId ? "metadata" : "billed-usage";
    const sameSizeRewrite = existing !== void 0 && fileStat.size === existing.sizeBytes && fileStat.mtimeMs !== existing.mtimeMs;
    if (extension === ".jsonl" && existing?.canAppendJsonl === true && existing.mode === mode && fileStat.size >= existing.jsonlOffsetBytes && !sameSizeRewrite) {
      await this.appendJsonlFile(resolvedPath, fileStat.size, fileStat.mtimeMs, existing);
    } else {
      await this.reparseFile(resolvedPath, { mode, keepEmpty: mode === "metadata" });
    }
  }
  async updatePathState(path, config) {
    const resolvedPath = (0, import_node_path5.resolve)(path);
    let pathStat;
    try {
      pathStat = await (0, import_promises4.stat)(resolvedPath);
    } catch {
      await this.deletePathState(resolvedPath);
      return;
    }
    if (pathStat.isDirectory()) {
      await this.updateFolderState(resolvedPath, config);
      return;
    }
    await this.updateFileState(resolvedPath, config);
  }
  async deletePathState(path) {
    const resolvedPath = (0, import_node_path5.resolve)(path);
    const stateKey = await fileStateKey(resolvedPath);
    let changed = this.files.delete(stateKey);
    const folderPrefix = stateKey.endsWith(import_node_path5.sep) ? stateKey : `${stateKey}${import_node_path5.sep}`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(folderPrefix)) {
        this.files.delete(filePath);
        changed = true;
      }
    }
    if (changed) {
      this.invalidateCaches();
    }
  }
  async updateFolderState(folder, config) {
    const scan = await scanUsageFiles([folder], {
      maxFileSizeBytes: config.maxFileSizeMb * 1024 * 1024,
      maxDepth: config.maxScanDepth,
      broadRootPaths: customDataRoots(config),
      includeFilesOutsideUsageFolders: false
    });
    this.watchFolders = uniqueResolvedPaths([folder, ...this.watchFolders, ...scan.watchFolders]);
    const billedUsageFiles = scan.files.filter((file) => !isMetadataPath(file));
    await forEachLimited(
      billedUsageFiles,
      MAX_CONCURRENT_FILE_PARSES,
      (file) => this.reparseFile(file, { mode: "billed-usage", keepEmpty: false })
    );
    await this.reparseMetadataFiles(scan.files, this.getBilledChatIds());
  }
  async appendJsonlFile(filePath, sizeBytes, mtimeMs, state) {
    if (sizeBytes === state.jsonlOffsetBytes) {
      state.sizeBytes = sizeBytes;
      return;
    }
    let content;
    try {
      content = await readUtf8Range(filePath, state.jsonlOffsetBytes, sizeBytes - state.jsonlOffsetBytes);
    } catch {
      await this.reparseFile(filePath, { mode: state.mode, keepEmpty: state.mode === "metadata" });
      return;
    }
    const parsed = parseCompleteJsonlLines(content, filePath);
    if (parsed.consumedBytes === 0) {
      state.sizeBytes = sizeBytes;
      return;
    }
    const normalized = normalizeItems(parsed.items, recordFilterForMode(state.mode));
    state.records.push(...normalized.records);
    state.parsedRecords += parsed.items.length;
    state.skippedRecords += parsed.malformedRecords + normalized.skippedRecords;
    state.jsonlOffsetBytes += parsed.consumedBytes;
    state.sizeBytes = sizeBytes;
    state.mtimeMs = mtimeMs;
    state.canAppendJsonl = true;
    if (parsed.items.length > 0 || parsed.malformedRecords > 0 || normalized.records.length > 0) {
      this.invalidateCaches();
    }
  }
  async reparseFile(filePath, options) {
    const resolvedPath = (0, import_node_path5.resolve)(filePath);
    const stateKey = await fileStateKey(resolvedPath);
    const mode = options.mode;
    const keepEmpty = options.keepEmpty ?? true;
    try {
      const fileStat = await (0, import_promises4.stat)(resolvedPath);
      const parsed = await parseUsageFile(resolvedPath, { mode });
      const canAppendJsonl = (0, import_node_path5.extname)(resolvedPath).toLowerCase() === ".jsonl" && await sizeBytesEndsAtLineBoundary(resolvedPath, fileStat.size);
      const state = buildState(
        resolvedPath,
        mode,
        fileStat.size,
        fileStat.mtimeMs,
        parsed,
        canAppendJsonl
      );
      if (keepEmpty || state.records.length > 0 || state.skippedRecords > 0 || state.skippedMalformedFiles > 0) {
        this.files.set(stateKey, state);
      } else {
        this.files.delete(stateKey);
      }
    } catch {
      this.files.set(stateKey, emptyMalformedState(resolvedPath, mode));
    }
    this.invalidateCaches();
  }
  async reparseMetadataFiles(files, billedChatIds) {
    if (billedChatIds.size === 0) {
      return;
    }
    const metadataFiles = files.filter((file) => metadataChatIdFromPath(file, billedChatIds) !== void 0);
    await forEachLimited(
      metadataFiles,
      MAX_CONCURRENT_FILE_PARSES,
      (file) => this.reparseFile(file, { mode: "metadata", keepEmpty: false })
    );
  }
  async refreshMetadataForBilledChats(config) {
    const billedChatIds = this.getBilledChatIds();
    if (billedChatIds.size === 0) {
      return;
    }
    const scan = await scanUsageFiles(this.roots, {
      maxFileSizeBytes: config.maxFileSizeMb * 1024 * 1024,
      maxDepth: config.maxScanDepth,
      broadRootPaths: customDataRoots(config),
      includeFilesOutsideUsageFolders: false
    });
    this.watchFolders = uniqueResolvedPaths([...this.watchFolders, ...scan.watchFolders]);
    await this.reparseMetadataFiles(scan.files, billedChatIds);
  }
  buildDiagnostics() {
    let parsedRecords = 0;
    let normalizedRecords = 0;
    let skippedMalformedFiles = 0;
    let skippedRecords = 0;
    for (const state of this.files.values()) {
      parsedRecords += state.parsedRecords;
      normalizedRecords += state.records.length;
      skippedMalformedFiles += state.skippedMalformedFiles;
      skippedRecords += state.skippedRecords;
    }
    return {
      roots: this.roots.length,
      files: this.files.size,
      parsedRecords,
      normalizedRecords,
      skippedMalformedFiles,
      skippedRecords,
      ...this.scanDiagnostics
    };
  }
  getRecords() {
    if (this.recordsCache === void 0) {
      this.recordsCache = Array.from(this.files.values()).flatMap((state) => state.records);
    }
    return this.recordsCache;
  }
  invalidateCaches() {
    this.recordsVersion += 1;
    this.recordsCache = void 0;
    this.summaryCache = void 0;
  }
  getBilledChatIds() {
    const chatIds = /* @__PURE__ */ new Set();
    for (const state of this.files.values()) {
      for (const record of state.records) {
        if (record.metadataOnly !== true && (record.billing?.aiCredits ?? 0) > 0) {
          chatIds.add(record.chatId);
        }
      }
    }
    return chatIds;
  }
  pruneMetadataForBilledChats(billedChatIds) {
    let changed = false;
    for (const [stateKey, state] of this.files) {
      if (state.mode !== "metadata") {
        continue;
      }
      if (metadataChatIdFromPath(state.filePath, billedChatIds) === void 0) {
        this.files.delete(stateKey);
        changed = true;
      }
    }
    if (changed) {
      this.invalidateCaches();
    }
  }
};
function buildState(filePath, mode, sizeBytes, mtimeMs, parsed, canAppendJsonl) {
  const normalized = normalizeItems(parsed.items, recordFilterForMode(mode));
  const extension = (0, import_node_path5.extname)(filePath).toLowerCase();
  return {
    filePath,
    mode,
    records: normalized.records,
    parsedRecords: parsed.items.length,
    skippedRecords: parsed.malformedRecords + normalized.skippedRecords,
    skippedMalformedFiles: 0,
    sizeBytes,
    mtimeMs,
    jsonlOffsetBytes: extension === ".jsonl" ? sizeBytes : 0,
    canAppendJsonl
  };
}
function normalizeItems(items, recordFilter = () => true) {
  const records = [];
  let skippedRecords = 0;
  for (const item of items) {
    const normalizedRecords = normalizeRawUsage(item).filter(recordFilter);
    skippedRecords += normalizedRecords.length === 0 ? 1 : 0;
    records.push(...normalizedRecords);
  }
  return { records, skippedRecords };
}
function emptyMalformedState(filePath, mode) {
  return {
    filePath,
    mode,
    records: [],
    parsedRecords: 0,
    skippedRecords: 0,
    skippedMalformedFiles: 1,
    sizeBytes: 0,
    mtimeMs: 0,
    jsonlOffsetBytes: 0,
    canAppendJsonl: false
  };
}
async function fileStateKey(filePath) {
  const canonicalPath = await (0, import_promises4.realpath)(filePath).catch(() => (0, import_node_path5.resolve)(filePath));
  return process.platform === "win32" ? canonicalPath.toLowerCase() : canonicalPath;
}
function recordFilterForMode(mode) {
  if (mode === "billed-usage") {
    return (record) => record.metadataOnly !== true && (record.billing?.aiCredits ?? 0) > 0;
  }
  if (mode === "metadata") {
    return (record) => record.metadataOnly === true;
  }
  return () => false;
}
function metadataChatIdFromPath(filePath, billedChatIds) {
  if (!isMetadataPath(filePath)) {
    return void 0;
  }
  const fileName = (0, import_node_path5.basename)(filePath);
  const fileStem = fileName.replace(/\.[^.]+$/, "");
  const parentName = (0, import_node_path5.basename)((0, import_node_path5.dirname)(filePath));
  const normalizedParent = parentName.toLowerCase();
  if (fileName.toLowerCase().startsWith("title-")) {
    return billedChatIds.has(parentName) ? parentName : void 0;
  }
  if (normalizedParent === "chatsessions" || normalizedParent === "emptywindowchatsessions" || normalizedParent === "transcripts") {
    return billedChatIds.has(fileStem) ? fileStem : void 0;
  }
  return void 0;
}
function isMetadataPath(filePath) {
  const fileName = (0, import_node_path5.basename)(filePath).toLowerCase();
  const parentName = (0, import_node_path5.basename)((0, import_node_path5.dirname)(filePath)).toLowerCase();
  return fileName.startsWith("title-") || parentName === "chatsessions" || parentName === "emptywindowchatsessions" || parentName === "transcripts";
}
function hasNewChatIds(previous, next) {
  for (const chatId of next) {
    if (!previous.has(chatId)) {
      return true;
    }
  }
  return false;
}
function emptyScanDiagnostics() {
  return {
    scannedFiles: 0,
    skippedFolders: 0,
    unsupportedFiles: 0,
    oversizedFiles: 0,
    unreadableFiles: 0
  };
}
function pruneNestedFolders(paths) {
  const resolvedPaths = uniqueResolvedPaths(paths).sort((left, right) => left.length - right.length);
  const kept = [];
  for (const path of resolvedPaths) {
    if (!kept.some((parent) => isSameOrInsidePath(path, parent))) {
      kept.push(path);
    }
  }
  return kept;
}
function customDataRoots(config) {
  const dataPath = config.dataPath.trim();
  return dataPath.length > 0 ? [dataPath] : [];
}
function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
async function forEachLimited(items, limit, worker) {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    })
  );
}
async function sizeBytesEndsAtLineBoundary(filePath, sizeBytes) {
  if (sizeBytes === 0) {
    return true;
  }
  const file = await (0, import_promises4.open)(filePath, "r");
  try {
    const buffer = Buffer.alloc(1);
    await file.read(buffer, 0, 1, sizeBytes - 1);
    return buffer[0] === 10 || buffer[0] === 13;
  } finally {
    await file.close();
  }
}
async function readUtf8Range(filePath, start, length) {
  const file = await (0, import_promises4.open)(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await file.read(buffer, 0, length, start);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await file.close();
  }
}

// src/ui/formatters.ts
function formatTokens(tokens) {
  if (tokens >= 1e6) {
    return `${Math.round(tokens / 1e5) / 10}M`;
  }
  if (tokens >= 1e3) {
    const thousands = Math.round(tokens / 1e3);
    return thousands >= 1e3 ? `${Math.round(thousands / 100) / 10}M` : `${thousands}k`;
  }
  return `${Math.round(tokens)}`;
}
var FIXED_USD_TO_SEK_RATE = 10;
function formatUsd(usd, partial = false) {
  const cents = Math.round(usd * 100);
  const formatted = cents <= 0 ? "0$" : cents < 100 ? `${(cents / 100).toFixed(2)}$` : `${Math.round(usd * 10) / 10}$`;
  return partial ? `${formatted}+` : formatted;
}
function formatSek(usd) {
  const ore = Math.round(usd * FIXED_USD_TO_SEK_RATE * 100);
  return ore <= 0 ? "0 SEK" : ore < 100 ? `${(ore / 100).toFixed(2)} SEK` : `${Math.round(ore / 10) / 10} SEK`;
}
function formatCost(usd) {
  return `${formatSek(usd)} (${formatUsd(usd)})`;
}

// src/ui/usageTreeProvider.ts
var vscode2 = __toESM(require("vscode"));
var UsageTreeProvider = class {
  constructor(now = () => /* @__PURE__ */ new Date(), sortMode = "time") {
    this.now = now;
    this.sortMode = sortMode;
  }
  now;
  sortMode;
  summary;
  setupNeeded = false;
  changeEmitter = new vscode2.EventEmitter();
  onDidChangeTreeData = this.changeEmitter.event;
  setSortMode(sortMode) {
    this.sortMode = sortMode;
    this.changeEmitter.fire();
  }
  setSummary(summary) {
    this.summary = summary;
    this.setupNeeded = false;
    this.changeEmitter.fire();
  }
  setSetupNeeded() {
    this.summary = void 0;
    this.setupNeeded = true;
    this.changeEmitter.fire();
  }
  getChildren(element) {
    if (this.setupNeeded) {
      return [];
    }
    if (!this.summary) {
      return [];
    }
    if (!element) {
      const buckets = buildBuckets(this.summary, this.now(), this.sortMode).map(
        (bucket) => ({ kind: "bucket", bucket })
      );
      return buckets.length > 0 ? buckets : [{ kind: "empty" }];
    }
    if (element.kind === "bucket") {
      return element.bucket.chats.map(
        (chat) => ({ kind: "chat", chat, bucketId: element.bucket.id })
      );
    }
    return [];
  }
  getTreeItem(element) {
    if (element.kind === "empty") {
      return new vscode2.TreeItem("No Copilot usage found", vscode2.TreeItemCollapsibleState.None);
    }
    if (element.kind === "bucket") {
      const item2 = new vscode2.TreeItem(
        element.bucket.label,
        element.bucket.id === "today" ? vscode2.TreeItemCollapsibleState.Expanded : vscode2.TreeItemCollapsibleState.Collapsed
      );
      item2.description = [
        formatSessionCount(element.bucket.chats.length),
        formatTokensWithCost(element.bucket.tokens, element.bucket.githubCopilot)
      ].join(" | ");
      item2.tooltip = [
        element.bucket.label,
        formatSessionCount(element.bucket.chats.length),
        `Tokens: ${formatExactTokens(element.bucket.tokens)}`,
        ...formatCostTooltipLines(element.bucket.githubCopilot)
      ].join("\n");
      return item2;
    }
    const item = new vscode2.TreeItem(element.chat.title, vscode2.TreeItemCollapsibleState.None);
    item.description = formatChatDescription(element.chat, element.bucketId);
    item.tooltip = formatChatTooltip(element.chat);
    item.contextValue = "chat";
    return item;
  }
};
function buildBuckets(summary, baseDate, sortMode) {
  const buckets = [
    { id: "today", label: "Today", chats: [], tokens: 0, githubCopilot: emptyCostEstimate2() },
    {
      id: "yesterday",
      label: "Yesterday",
      chats: [],
      tokens: 0,
      githubCopilot: emptyCostEstimate2()
    },
    { id: "older", label: "Older", chats: [], tokens: 0, githubCopilot: emptyCostEstimate2() }
  ];
  for (const chat of summary.chats) {
    const dayDiff = differenceInLocalCalendarDays(chat.timestamp, baseDate);
    const bucket = dayDiff === 0 ? buckets[0] : dayDiff === 1 ? buckets[1] : buckets[2];
    bucket.chats.push(chat);
    bucket.tokens += chat.tokens;
    addCost2(bucket.githubCopilot, chat.githubCopilot);
  }
  for (const bucket of buckets) {
    bucket.chats.sort(comparerForSortMode(sortMode));
  }
  return buckets.filter((bucket) => bucket.chats.length > 0);
}
function comparerForSortMode(sortMode) {
  return sortMode === "cost" ? compareChatsByCost2 : compareChatsByTime;
}
function compareChatsByTime(left, right) {
  return right.timestamp.getTime() - left.timestamp.getTime();
}
function compareChatsByCost2(left, right) {
  return right.githubCopilot.aiCredits - left.githubCopilot.aiCredits || right.tokens - left.tokens || compareChatsByTime(left, right);
}
function emptyCostEstimate2() {
  return {
    available: false,
    usd: 0,
    aiCredits: 0
  };
}
function addCost2(target, addition) {
  target.usd += addition.usd;
  target.aiCredits += addition.aiCredits;
  target.available ||= addition.available;
}
function formatTokensWithCost(tokens, cost) {
  const formattedCost = hasDisplayableCost(cost) ? ` (${formatCost(cost.usd)})` : "";
  return `${formatTokens(tokens)}${formattedCost}`;
}
function formatCostTooltipLines(cost) {
  return hasDisplayableCost(cost) ? [`Cost: ${formatCost(cost.usd)}`] : [];
}
function hasDisplayableCost(cost) {
  return cost.available && cost.aiCredits > 0;
}
function formatExactTokens(tokens) {
  return `${Math.round(tokens)}`;
}
function formatSessionCount(count) {
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}
function formatDiagnostics(diagnostics) {
  const lines = [
    `Roots: ${diagnostics.roots}`,
    `Files: ${diagnostics.files}`,
    `Parsed records: ${diagnostics.parsedRecords}`,
    `Normalized records: ${diagnostics.normalizedRecords}`,
    `Skipped folders: ${diagnostics.skippedFolders}`,
    `Skipped malformed files: ${diagnostics.skippedMalformedFiles}`,
    `Skipped records: ${diagnostics.skippedRecords}`,
    `Unsupported files: ${diagnostics.unsupportedFiles}`,
    `Oversized files: ${diagnostics.oversizedFiles}`,
    `Unreadable files: ${diagnostics.unreadableFiles}`
  ];
  return lines.join("\n");
}
function formatChatDescription(chat, bucketId) {
  const timestamp = bucketId === "older" ? formatDateTime(chat.timestamp) : formatTime(chat.timestamp);
  return [timestamp, chat.model, formatTokensWithCost(chat.tokens, chat.githubCopilot)].join(" | ");
}
function formatChatTooltip(chat) {
  return [
    `Chat ID: ${chat.chatId}`,
    `Model: ${chat.model}`,
    `Date: ${chat.timestamp.toLocaleString()}`,
    `Tokens: ${formatExactTokens(chat.tokens)}`,
    ...formatCostTooltipLines(chat.githubCopilot)
  ].join("\n");
}
function differenceInLocalCalendarDays(date, baseDate) {
  const dateStart = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const baseStart = Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  return Math.floor((baseStart - dateStart) / 864e5);
}
function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}
function formatDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function pad2(value) {
  return value.toString().padStart(2, "0");
}

// src/extension.ts
var STATUS_BAR_DISPLAY = {
  scanningText: "Scanning Sessions...",
  failedText: "Scan Failed",
  setupNeededText: "Enable Copilot logs to see token use",
  tooltip: "Click to open Copilot usage.",
  separator: " | "
};
var SETUP_NEEDED_CONTEXT = "tonyozrCopilotUsage.setupNeeded";
var SORT_MODE_CONTEXT = "tonyozrCopilotUsage.sortMode";
var SORT_MODE_STORAGE_KEY = "tonyozrCopilotUsage.sortMode";
var USAGE_WATCH_GLOB = "**/{github.copilot-chat,GitHub.copilot-chat,debug-logs,transcripts,chatSessions,chatsessions,emptyWindowChatSessions,emptywindowchatsessions}/**";
var CUSTOM_DATA_PATH_WATCH_GLOB = "**/*.{json,jsonl}";
var STATUS_BAR_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
var STATUS_BAR_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
function formatSessionCount2(count) {
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}
function formatStatusBarCost(cost) {
  return cost.available && cost.aiCredits > 0 ? formatCost(cost.usd) : void 0;
}
function formatStatusBarCurrency(amount) {
  return STATUS_BAR_CURRENCY_FORMATTER.format(amount);
}
function formatStatusBarTokens(tokens) {
  return `${STATUS_BAR_NUMBER_FORMATTER.format(tokens)} tok`;
}
function formatStatusBarCount(count, suffix) {
  return `${STATUS_BAR_NUMBER_FORMATTER.format(count)} ${suffix}`;
}
function getMonthChats(summary, now) {
  return summary.chats.filter(
    (chat) => chat.timestamp.getFullYear() === now.getFullYear() && chat.timestamp.getMonth() === now.getMonth()
  );
}
function formatStatusBarTooltip(summary) {
  const summaryItems = [
    formatTooltipSummaryItem("Today", summary.today),
    formatTooltipSummaryItem("Month", summary.month),
    formatTooltipSummaryItem("All time", summary.allTime)
  ];
  const lines = [formatTooltipSummaryLine(summaryItems), "", "---", ""];
  const topModelRows = summary.topModels.map(
    (model, index) => formatTopModelTableRow(
      index,
      model.model,
      model.sessions,
      formatTokensWithCost2(model.tokens, model.githubCopilot)
    )
  );
  lines.push(...formatTopModelsTooltipRows(topModelRows));
  lines.push("", "---", "", ...formatHighestTodayTooltipRows(summary));
  lines.push("", "---", "", "Click for detailed chat entries");
  const tooltip = new vscode3.MarkdownString(lines.join("\n"), true);
  tooltip.supportHtml = true;
  return tooltip;
}
function formatTooltipSummaryItem(label, total) {
  return `**${label}:**&nbsp;${formatTokensWithCost2(total.tokens, total.githubCopilot)}`;
}
function formatTooltipSummaryLine(items) {
  return items.join("&nbsp;&nbsp;|&nbsp;&nbsp;");
}
function formatTokensWithCost2(tokens, costEstimate) {
  const cost = formatStatusBarCost(costEstimate);
  return `${formatTokens(tokens)}${cost ? ` (${cost})` : ""}`;
}
function formatTopModelTableRow(index, model, sessions, value) {
  return `<tr><td>${index + 1}. ${escapeHtml(model)}</td><td align="right">${formatSessionCount2(sessions)} | ${escapeHtml(value)}</td></tr>`;
}
function formatTopModelsTooltipRows(rows) {
  return formatTooltipTable([
    '<tr><td colspan="2"><strong>Model use:</strong></td></tr>',
    ...rows.length > 0 ? rows : ['<tr><td colspan="2">No sessions yet.</td></tr>']
  ]);
}
function formatTooltipTable(rows) {
  return ['<table width="100%" style="min-width: 450px">', ...rows, "</table>"];
}
function formatHighestTodayTooltipRows(summary) {
  if (!summary.highestSessionToday) {
    return ["**Today highlights:**", "No sessions today."];
  }
  const rows = formatTooltipTable(
    formatTodayHighlightTableRows("Most tokens today", summary.highestSessionToday)
  );
  if (summary.mostExpensiveSessionToday) {
    rows.push(
      "",
      "---",
      "",
      ...formatTooltipTable(
        formatTodayHighlightTableRows("Most expensive today", summary.mostExpensiveSessionToday)
      )
    );
  }
  return rows;
}
function formatTodayHighlightTableRows(label, chat) {
  return [
    `<tr><td colspan="2"><strong>${label}:</strong></td></tr>`,
    `<tr><td>${escapeHtml(chat.title)} | ${escapeHtml(chat.model)}</td><td align="right">${escapeHtml(formatTokensWithCost2(chat.tokens, chat.githubCopilot))}</td></tr>`
  ];
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatStatusBarSummary(summary, now = /* @__PURE__ */ new Date()) {
  if (summary.month.tokens === 0) {
    return "No sessions this month";
  }
  const monthChats = getMonthChats(summary, now);
  const requestCount = monthChats.reduce((total, chat) => total + chat.records.length, 0);
  const segments = [];
  if (summary.month.githubCopilot.available && summary.month.githubCopilot.aiCredits > 0) {
    segments.push(
      `${formatStatusBarCurrency(summary.month.githubCopilot.usd * FIXED_USD_TO_SEK_RATE)} SEK`,
      `$${formatStatusBarCurrency(summary.month.githubCopilot.usd)}`
    );
  }
  segments.push(
    formatStatusBarTokens(summary.month.tokens),
    formatStatusBarCount(monthChats.length, "sess"),
    formatStatusBarCount(requestCount, "req")
  );
  return segments.join(STATUS_BAR_DISPLAY.separator);
}
function setStatusBarScanning(statusBar) {
  statusBar.text = STATUS_BAR_DISPLAY.scanningText;
  statusBar.tooltip = STATUS_BAR_DISPLAY.tooltip;
  statusBar.command = "tonyozrCopilotUsage.openView";
}
function setStatusBarReady(statusBar, summary) {
  statusBar.text = formatStatusBarSummary(summary);
  statusBar.tooltip = formatStatusBarTooltip(summary);
  statusBar.command = "tonyozrCopilotUsage.openView";
}
function setStatusBarFailed(statusBar, error) {
  statusBar.text = STATUS_BAR_DISPLAY.failedText;
  statusBar.tooltip = error instanceof Error ? error.message : String(error);
  statusBar.command = "tonyozrCopilotUsage.openView";
}
function setStatusBarSetupNeeded(statusBar) {
  statusBar.text = STATUS_BAR_DISPLAY.setupNeededText;
  statusBar.tooltip = void 0;
  statusBar.command = "tonyozrCopilotUsage.openCopilotLoggingSetting";
}
function activate(context) {
  const treeProvider = new UsageTreeProvider(() => /* @__PURE__ */ new Date(), readPersistedSortMode(context));
  const statusBar = vscode3.window.createStatusBarItem(vscode3.StatusBarAlignment.Right, 100);
  const usageIndex = new UsageIndex();
  let latestDiagnostics;
  let currentConfig = readConfig();
  let generation = 0;
  const watcherDisposablesByFolder = /* @__PURE__ */ new Map();
  let eventTimer;
  let eventGeneration = 0;
  let updateChain = Promise.resolve();
  const changedPaths = /* @__PURE__ */ new Set();
  const deletedPaths = /* @__PURE__ */ new Set();
  statusBar.command = "tonyozrCopilotUsage.openView";
  setStatusBarScanning(statusBar);
  statusBar.show();
  void setSortModeContext(readPersistedSortMode(context));
  async function runRefresh() {
    const refreshGeneration = ++generation;
    try {
      if (!isCopilotFileLoggingEnabled()) {
        treeProvider.setSetupNeeded();
        void setSetupNeededContext(true);
        setStatusBarSetupNeeded(statusBar);
        disposeWatchers();
        return;
      }
      void setSetupNeededContext(false);
      currentConfig = readConfig();
      const config = currentConfig;
      setStatusBarScanning(statusBar);
      const roots = await locateCopilotDataPaths(config.dataPath);
      const result = await usageIndex.rebuild({ roots, config });
      if (refreshGeneration !== generation) {
        return;
      }
      applyResult(result);
      syncWatchers(usageIndex.getWatchFolders());
    } catch (error) {
      if (refreshGeneration === generation) {
        setStatusBarFailed(statusBar, error);
      }
    }
  }
  async function openView() {
    await vscode3.commands.executeCommand("tonyozrCopilotUsage.views.usage.focus");
  }
  async function openSourceLog(node) {
    if (node?.kind !== "chat") {
      return;
    }
    const sourceLogs = buildSourceLogPicks(node);
    if (sourceLogs.length === 0) {
      await vscode3.window.showInformationMessage("No source log available for this session.");
      return;
    }
    if (sourceLogs.length === 1) {
      await openFile(sourceLogs[0].filePath);
      return;
    }
    const selected = await vscode3.window.showQuickPick(sourceLogs, {
      placeHolder: "Open source log"
    });
    if (selected) {
      await openFile(selected.filePath);
    }
  }
  async function openFile(filePath) {
    await vscode3.commands.executeCommand("vscode.open", vscode3.Uri.file(filePath));
  }
  function applyResult(result) {
    latestDiagnostics = result.diagnostics;
    void setSetupNeededContext(false);
    treeProvider.setSummary(result.summary);
    setStatusBarReady(statusBar, result.summary);
  }
  function setSetupNeededContext(value) {
    return vscode3.commands.executeCommand("setContext", SETUP_NEEDED_CONTEXT, value);
  }
  function setSortModeContext(value) {
    return vscode3.commands.executeCommand("setContext", SORT_MODE_CONTEXT, value);
  }
  async function setSortMode(value) {
    treeProvider.setSortMode(value);
    await context.globalState.update(SORT_MODE_STORAGE_KEY, value);
    await setSortModeContext(value);
  }
  function syncWatchers(folders) {
    const desiredFolders = new Set(folders);
    for (const folder of watcherDisposablesByFolder.keys()) {
      if (!desiredFolders.has(folder)) {
        disposeFolderWatchers(folder);
      }
    }
    for (const folder of folders) {
      if (watcherDisposablesByFolder.has(folder)) {
        continue;
      }
      watcherDisposablesByFolder.set(folder, [...registerUsageWatcher(folder)]);
    }
  }
  function disposeWatchers() {
    for (const folder of watcherDisposablesByFolder.keys()) {
      disposeFolderWatchers(folder);
    }
  }
  function disposeFolderWatchers(folder) {
    const disposables = watcherDisposablesByFolder.get(folder);
    if (!disposables) {
      return;
    }
    for (const disposable of disposables) {
      disposable.dispose();
    }
    watcherDisposablesByFolder.delete(folder);
  }
  function registerUsageWatcher(folder) {
    const watcher = vscode3.workspace.createFileSystemWatcher(
      new vscode3.RelativePattern(vscode3.Uri.file(folder), watchGlobForFolder(folder))
    );
    return [
      watcher,
      watcher.onDidChange((uri) => scheduleFileUpdate(uri.fsPath)),
      watcher.onDidCreate((uri) => {
        void scheduleCreatedPath(uri.fsPath);
      }),
      watcher.onDidDelete((uri) => scheduleDelete(uri.fsPath))
    ];
  }
  function watchGlobForFolder(folder) {
    return isCustomDataWatchFolder(folder) ? CUSTOM_DATA_PATH_WATCH_GLOB : USAGE_WATCH_GLOB;
  }
  function isCustomDataWatchFolder(folder) {
    const dataPath = currentConfig.dataPath.trim();
    return dataPath.length > 0 && isSameOrInsidePath(folder, dataPath);
  }
  async function scheduleCreatedPath(path) {
    try {
      const fileStat = await (0, import_promises5.stat)(path);
      if (fileStat.isDirectory()) {
        syncWatchers([...usageIndex.getWatchFolders(), path]);
        scheduleFileUpdate(path, true);
      } else {
        scheduleFileUpdate(path);
      }
    } catch {
      return;
    }
  }
  function scheduleFileUpdate(filePath, force = false) {
    if (!force && !shouldProcessFileEvent(filePath)) {
      return;
    }
    changedPaths.add(filePath);
    deletedPaths.delete(filePath);
    scheduleEventFlush();
  }
  function shouldProcessFileEvent(filePath) {
    const dataPath = currentConfig.dataPath.trim();
    return pathContainsUsageFolder(filePath) || dataPath.length > 0 && isSameOrInsidePath(filePath, dataPath);
  }
  function scheduleDelete(path) {
    deletedPaths.add(path);
    changedPaths.delete(path);
    scheduleEventFlush();
  }
  function scheduleEventFlush() {
    eventGeneration = generation;
    if (eventTimer) {
      clearTimeout(eventTimer);
    }
    eventTimer = setTimeout(() => {
      eventTimer = void 0;
      const pathsToUpdate = Array.from(changedPaths);
      const pathsToDelete = Array.from(deletedPaths);
      changedPaths.clear();
      deletedPaths.clear();
      const flushGeneration = eventGeneration;
      updateChain = updateChain.then(() => processFileEvents(pathsToUpdate, pathsToDelete, flushGeneration)).catch((error) => setStatusBarFailed(statusBar, error));
    }, 100);
  }
  async function processFileEvents(pathsToUpdate, pathsToDelete, flushGeneration) {
    if (flushGeneration !== generation) {
      return;
    }
    const config = currentConfig;
    const result = await usageIndex.applyChanges({
      pathsToDelete,
      pathsToUpdate,
      config
    });
    if (flushGeneration !== generation) {
      return;
    }
    applyResult(result);
    syncWatchers(usageIndex.getWatchFolders());
  }
  context.subscriptions.push(
    statusBar,
    vscode3.window.registerTreeDataProvider("tonyozrCopilotUsage.views.usage", treeProvider),
    vscode3.commands.registerCommand("tonyozrCopilotUsage.refresh", () => runRefresh()),
    vscode3.commands.registerCommand("tonyozrCopilotUsage.openView", () => openView()),
    vscode3.commands.registerCommand(
      "tonyozrCopilotUsage.openSourceLog",
      (node) => openSourceLog(node)
    ),
    vscode3.commands.registerCommand("tonyozrCopilotUsage.sortSessionsByCost", () => setSortMode("cost")),
    vscode3.commands.registerCommand("tonyozrCopilotUsage.sortSessionsByTime", () => setSortMode("time")),
    vscode3.commands.registerCommand(
      "tonyozrCopilotUsage.openCopilotLoggingSetting",
      () => vscode3.commands.executeCommand(
        "workbench.action.openSettings",
        `@id:${COPILOT_FILE_LOGGING_SETTING}`
      )
    ),
    vscode3.commands.registerCommand(
      "tonyozrCopilotUsage.showDiagnostics",
      () => vscode3.window.showInformationMessage(
        latestDiagnostics ? formatDiagnostics(latestDiagnostics) : "No Copilot usage scan has completed yet.",
        { modal: true }
      )
    ),
    vscode3.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("tonyozrCopilotUsage") && !event.affectsConfiguration(COPILOT_FILE_LOGGING_SETTING)) {
        return;
      }
      void runRefresh();
    }),
    new vscode3.Disposable(() => {
      disposeWatchers();
      if (eventTimer) {
        clearTimeout(eventTimer);
      }
    })
  );
  void runRefresh();
}
function deactivate() {
}
function readPersistedSortMode(context) {
  return context.globalState.get(SORT_MODE_STORAGE_KEY, "time") === "cost" ? "cost" : "time";
}
function buildSourceLogPicks(node) {
  const logsByPath = /* @__PURE__ */ new Map();
  for (const record of node.chat.records) {
    const existing = logsByPath.get(record.filePath);
    if (existing && existing.timestamp >= record.timestamp) {
      continue;
    }
    logsByPath.set(record.filePath, {
      filePath: record.filePath,
      timestamp: record.timestamp
    });
  }
  return Array.from(logsByPath.values()).sort(
    (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
  ).map((log) => ({
    label: (0, import_node_path6.basename)(log.filePath),
    description: log.filePath,
    filePath: log.filePath
  }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate,
  formatStatusBarSummary,
  formatStatusBarTooltip
});
//# sourceMappingURL=extension.js.map
