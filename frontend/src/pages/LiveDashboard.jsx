import { useEffect, useMemo, useState } from "react";
import { useDataCache } from "../contexts/DataCacheContext";
import ConversationThread from "../components/ConversationThread";
import AnalyticsBar from "../components/AnalyticsBar";
import { syncChats, getConversation } from "../api";
import { toSydneyTime } from "../utils";
import removeMd from "remove-markdown";

export default function LiveDashboard() {
  const { conversations, loadingConversations, error: cacheError, refetchConversations, refetchAnalytics } = useDataCache();
  const [selectedId, setSelectedId] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversationWithMessages, setSelectedConversationWithMessages] = useState(null);

  const conversationsWithLabel = useMemo(() => {
    const withTimestamps = conversations.map((c) => {
      const lastMessageAt = c.last_message_at || c.created_at;

      return {
        ...c,
        lastUserTimestamp: lastMessageAt
          ? new Date(lastMessageAt).getTime()
          : 0,
      };
    });

    const sorted = withTimestamps.sort(
      (a, b) => b.lastUserTimestamp - a.lastUserTimestamp
    );

    return sorted.map((c, idx) => ({
      ...c,
      sessionLabel: `User Session : ${idx + 1}`,
      sessionNumber: String(idx + 1),
    }));
  }, [conversations]);



  const filteredConversations = useMemo(() => {
    if (!searchId.trim()) return conversationsWithLabel;
    const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const searchNorm = normalize(searchId.trim());

    return conversationsWithLabel.filter((c) => {
      const idNorm = normalize(c.id);
      const labelNorm = normalize(c.sessionLabel);
      const previewNorm = normalize(c.preview);
      return (
        idNorm.includes(searchNorm) ||
        labelNorm.includes(searchNorm) ||
        c.sessionNumber === searchNorm ||
        previewNorm.includes(searchNorm)
      );
    });
  }, [conversationsWithLabel, searchId]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedConversationWithMessages(null);
      return;
    }

    async function fetchMessages() {
      setLoadingMessages(true);
      try {
        const fullConversation = await getConversation(selectedId);
        // Map the conversation to match the expected format
        const mapped = {
          ...fullConversation,
          messages: (fullConversation.messages || [])
            .filter(m => {
              // Ignore tool messages
              if (m.role === "tool") return false;

              // Ignore assistant messages with tool-call content
              if (m.role === "assistant" && typeof m.content === "string" && m.content.includes("tool-call")) {
                return false;
              }

              return true;
            })
            .map(m => ({
              ...m,
              text: m.content,
              sender: m.role === "user" ? "User" : "AI",
              timestamp: m.createdAt,
            }))
        };
        setSelectedConversationWithMessages(mapped);
      } catch (error) {
        console.error("Failed to fetch conversation messages:", error);
        setSelectedConversationWithMessages(null);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [selectedId]);

  // Get base conversation data for metadata (without messages)
  const selected = useMemo(() => {
    return selectedId
      ? conversations.find((c) => c.id === selectedId) ?? null
      : null;
  }, [selectedId, conversations]);

  const lastActiveTime = useMemo(() => {
    const hasSelectedMessages =
      selectedConversationWithMessages?.id &&
      selectedConversationWithMessages.id === selectedId &&
      Array.isArray(selectedConversationWithMessages.messages) &&
      selectedConversationWithMessages.messages.length > 0;

    if (hasSelectedMessages) {
      const latest = selectedConversationWithMessages.messages.reduce((latestMsg, msg) => {
        const ts = msg.timestamp || msg.createdAt;
        if (!ts) return latestMsg;
        const tsDate = new Date(ts);
        if (Number.isNaN(tsDate.getTime())) return latestMsg;
        if (!latestMsg) return { date: tsDate };
        return tsDate > latestMsg.date ? { date: tsDate } : latestMsg;
      }, null);

      if (latest?.date) return latest.date;
    }

    if (!selected?.last_message_at) return null;
    const fallback = new Date(selected.last_message_at);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }, [selectedConversationWithMessages, selectedId, selected?.last_message_at]);

  const sessionCreatedTime = useMemo(() => {
    const hasSelectedMessages =
      selectedConversationWithMessages?.id &&
      selectedConversationWithMessages.id === selectedId &&
      Array.isArray(selectedConversationWithMessages.messages) &&
      selectedConversationWithMessages.messages.length > 0;

    if (hasSelectedMessages) {
      const earliest = selectedConversationWithMessages.messages.reduce((acc, msg) => {
        const ts = msg.timestamp || msg.createdAt;
        if (!ts) return acc;
        const date = new Date(ts);
        if (Number.isNaN(date.getTime())) return acc;
        if (!acc) return date;
        return date < acc ? date : acc;
      }, null);

      if (earliest) return earliest;
    }

    if (!selected?.created_at) return null;
    const fallback = new Date(selected.created_at);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }, [selectedConversationWithMessages, selectedId, selected?.created_at]);

  useEffect(() => {
    if (filteredConversations.length > 0 && !selectedId) {
      setSelectedId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedId]);

  useEffect(() => {
    if (!selectedId || filteredConversations.length === 0) return;
    const exists = filteredConversations.some((c) => c.id === selectedId);
    if (!exists) setSelectedId(filteredConversations[0]?.id ?? null);
  }, [filteredConversations, selectedId]);

  // --- LOADING CHECK (Moved below all hooks) ---
  if (loadingConversations) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "var(--secondary-bg)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 animate-spin" style={{ borderColor: 'var(--primary-border)', borderTopColor: 'var(--accent-green)', borderRadius: '50%' }} />
          <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>Loading conversations...</div>
        </div>
      </div>
    );
  }

  const formattedLastActive = lastActiveTime
    ? toSydneyTime(lastActiveTime.toISOString())
    : "-";


  const hasNoConversations = filteredConversations.length === 0;

  return (
    <div className="app-container h-full flex flex-col" style={{ backgroundColor: "var(--secondary-bg)" }}>
      <div className="w-full px-6 pb-4">
        <AnalyticsBar />
      </div>

      <div className="px-6 pb-6">
        <div className="flex gap-4" style={{ width: "1168px" }}>

          {/* LEFT PANEL: CONVERSATION LIST */}
          <div
            className="flex flex-col rounded-[14px] border overflow-hidden shadow-sm"
            style={{
              width: "280px",
              height: "600px",
              backgroundColor: 'var(--primary-bg)',
              borderColor: 'var(--primary-border)'
            }}
          >
            {/* Search Header */}
            <div className="px-5 py-4 border-b shrink-0 bg-white" style={{ borderBottom: '1px solid var(--primary-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: 'var(--primary-text)' }}>
                  Conversations
                </h2>
                <button
                  onClick={async () => {
                    if (syncing) return;
                    setSyncing(true);
                    try {
                      await syncChats();

                      // Stop the refresh animation as soon as:
                      // 1) /api/sync/chats finishes, and
                      // 2) /api/conversations finishes (via refetchConversations)
                      await refetchConversations(true);
                    } catch (error) {
                      console.error("Sync chats failed:", error);
                    } finally {
                      setSyncing(false);

                      // Refresh analytics in the background (can be slower).
                      Promise.resolve(refetchAnalytics(true)).catch((err) => {
                        console.error("Refetch analytics failed:", err);
                      });
                    }
                  }}
                  disabled={syncing}
                  className="rounded-full transition-all hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title={syncing ? "Syncing with database..." : "Refresh conversations"}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <img
                      src="/conversations2.svg"
                      alt=""
                      className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                    />
                  </div>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search Chat"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 text-gray-900 transition-all"
              />
            </div>

            {/* Conversation List Items */}
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {cacheError ? (
                <div className="p-5 text-red-600 text-sm">{cacheError}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-5 text-gray-500 text-sm text-center">No conversations found</div>
              ) : (
                filteredConversations.map((c, idx) => {
                  const isSelected = selectedId === c.id;
                  // Use last_message field directly from API

                  const previewText = c.last_message
                    ? removeMd(c.last_message).substring(0, 60) +
                    (removeMd(c.last_message).length > 100 ? "..." : "")
                    : "No messages yet";

                  const timestamp = c.last_message_at || c.created_at
                    ? toSydneyTime(c.last_message_at || c.created_at)
                    : "—";

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left rounded-lg transition-all px-4 py-3 border ${isSelected ? "bg-emerald-50 border-emerald-500" : "bg-gray-50 border-transparent hover:bg-gray-100"}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {c.sessionLabel || `User Session : ${idx + 1}`}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 line-clamp-1 mb-2">
                        {previewText}
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">{timestamp}</span>
                        {/* <span
                          className="px-1.5 py-0.5 rounded-full text-gray-700 font-medium"
                          style={{ backgroundColor: "var(--location-textindia)" }}
                        >
                          {c.country || "Country Unknown"}
                        </span> */}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED THREAD */}
          <div
            className="flex flex-col bg-white rounded-[14px] border border-slate-200 overflow-hidden shadow-sm"
            style={{ width: "872px", height: "600px" }}
          >
            <div className="px-6 py-4 border-b border-slate-200 shrink-0" style={{ background: 'var(--header-bg)' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-slate-900 font-semibold text-base">{"User Session"}</h2>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Last active:</span> {hasNoConversations ? "-" : formattedLastActive}
                  </div>
                </div>
                {/* <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {hasNoConversations ? "-" : (selected?.country || "Country Unknown")}
                </div> */}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 -ml-1">
                  ID: {selected?.id || "-"}
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  Created: {sessionCreatedTime ? toSydneyTime(sessionCreatedTime.toISOString()) : "-"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderColor: 'var(--primary-border)', borderTopColor: 'var(--accent-green)' }} />
                    <div className="text-sm text-gray-500">Loading messages...</div>
                  </div>
                </div>
              ) : selected?.id && selected?.created_at ? (
                <div className="px-6 py-4">
                  <ConversationThread convo={selectedConversationWithMessages} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm" style={{ color: "var(--tertiary-text)" }}>
                    No Conversations Found
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
