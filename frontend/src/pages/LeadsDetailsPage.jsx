import { useEffect, useMemo, useState } from "react";
import { getLeadProductDetails } from "../api";
import { toSydneyTime } from "../utils";

export default function LeadsDetailsPage({ lead, onBack, onViewChat }) {
    const [showAllRecommended, setShowAllRecommended] = useState(false);
    const [showAllClicked, setShowAllClicked] = useState(false);
    const [showAllConversations, setShowAllConversations] = useState(false);
    const [loading, setLoading] = useState(true);
    const [productDetails, setProductDetails] = useState({
        conversations: [],
        recommended_products: [],
        clicked_products: [],
    });
    const [error, setError] = useState(null);

    if (!lead) return null;

    useEffect(() => {
        let isMounted = true;
        async function fetchDetails() {
            try {
                setLoading(true);
                setError(null);
                const data = await getLeadProductDetails(lead.id);
                if (!isMounted) return;
                setProductDetails({
                    recommended_products: data?.recommended_products || [],
                    clicked_products: data?.clicked_products || [],
                    conversations: data?.conversations || [],
                });
            } catch (err) {
                if (!isMounted) return;
                console.error(err);
                setError("Failed to load product details");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDetails();
        return () => {
            isMounted = false;
        };
    }, [lead.id]);

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return toSydneyTime(dateString);
    };

    const getProductTitle = (url) => {
        if (!url) return "—";
        try {
            const u = new URL(url);
            const slug = u.pathname.split("/").filter(Boolean).pop() || "";
            return slug
                .split("-")
                .filter(Boolean)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
        } catch {
            const slug = String(url).split("/").filter(Boolean).pop() || "";
            return slug
                .split("-")
                .filter(Boolean)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ") || url;
        }
    };

    const initials = lead.name
        ? lead.name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join("")
        : "?";

    const recommendedProducts = useMemo(
        () =>
            (productDetails.recommended_products || []).map((item) => ({
                id: item.rec_id || item.message_id || item.product_url,
                name: getProductTitle(item.product_url || item.normalized_url),
                timestamp: formatDate(item.recommended_at),
                url: item.product_url || item.normalized_url,
                conversation_id: item.conversation_id,
            })),
        [productDetails.recommended_products]
    );

    const clickedProducts = useMemo(
        () =>
            (productDetails.clicked_products || []).map((item) => ({
                id: item.redirect_id || item.tracking_id || item.target_url,
                name: getProductTitle(item.target_url || item.normalized_url),
                timestamp: formatDate(item.clicked_at),
                url: item.target_url || item.normalized_url,
                conversation_id: item.conversation_id,
            })),
        [productDetails.clicked_products]
    );

    const conversations = useMemo(
        () =>
            (productDetails.conversations || []).map((item) => ({
                id: item.conversation_id,
                source: item.source_system || "Chat",
                timestamp: formatDate(item.started_at),
                ended_at: formatDate(item.ended_at),
                started_at: item.started_at,
                ended_at_iso: item.ended_at,
                status: item.status,
            })),
        [productDetails.conversations]
    );

    const visibleRecommended = showAllRecommended
        ? recommendedProducts
        : recommendedProducts.slice(0, 5);

    const visibleClicked = showAllClicked
        ? clickedProducts
        : clickedProducts.slice(0, 5);

    const visibleConversations = showAllConversations
        ? conversations
        : conversations.slice(0, 5);

    const handleViewChatClick = (id) => {
        if (onViewChat) onViewChat(id);
    };

    return (
        <div className="h-full flex flex-col p-4 overflow-auto bg-gray-50">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl text-gray-400 transition-all"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <h1 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "20px", lineHeight: "28px", letterSpacing: "-0.36px" }} className="text-gray-900">
                    Lead Details
                </h1>
            </div>

            {/* Profile */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100 mb-3">
                    <span className="text-xl font-bold text-emerald-600">{initials}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{lead.name || "—"}</h2>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{lead.email || "No email address"}</p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto w-full pb-10">
                {[
                    { title: "Conversations", label: "Started at", data: visibleConversations, total: conversations.length, state: showAllConversations, setState: setShowAllConversations, keyPrefix: "conv", isChatSection: true },
                    { title: "Product Recommended", label: "Recommended at", data: visibleRecommended, total: recommendedProducts.length, state: showAllRecommended, setState: setShowAllRecommended, keyPrefix: "rec" },
                    { title: "Products Clicked", label: "Clicked at", data: visibleClicked, total: clickedProducts.length, state: showAllClicked, setState: setShowAllClicked, keyPrefix: "click" },
                ].map((section) => (
                    <div key={section.title} className="bg-white rounded-[2rem] border border-gray-100 flex flex-col overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-md font-bold text-gray-800">{section.title}</h3>
                                <span className="text-[10px] font-black bg-emerald-50 px-2.5 py-1 rounded-lg text-emerald-600 uppercase">Total: {section.total}</span>
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {loading ? (
                                <div className="py-6 text-center text-xs text-gray-400">Loading...</div>
                            ) : error ? (
                                <div className="py-6 text-center text-xs text-rose-500">{error}</div>
                            ) : section.data.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-400">No data available</div>
                            ) : (
                                section.data.map((item, index) => {
                                    const itemId = `${section.keyPrefix}-${item.id}`;
                                    if (section.isChatSection) {
                                        return (
                                            <div key={itemId} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                <div className="pr-3">
                                                    <div className="text-sm font-semibold text-gray-700">{`Session : ${index + 1}`}</div>
                                                    <div className="text-[10px] text-gray-400">Started: {item.timestamp}</div>
                                                    {item.ended_at && (
                                                        <div className="text-[10px] text-gray-400">Ended: {item.ended_at}</div>
                                                    )}
                                                </div>
                                                <a
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        handleViewChatClick(item.id);
                                                    }}
                                                    className="!text-emerald-600 !visited:text-emerald-600 hover:!text-emerald-700 no-underline transition-colors outline-none whitespace-nowrap text-[14px] font-bold"
                                                >
                                                    View Chat
                                                </a>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={itemId} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                            <div className="pr-3">
                                                <div className="text-sm font-semibold text-gray-700">{item.name}</div>
                                                <div className="text-[10px] text-gray-400">{section.label}: {item.timestamp}</div>
                                                {item.url ? (
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] text-emerald-600 hover:text-emerald-700"
                                                    >
                                                        View product
                                                    </a>
                                                ) : null}
                                            </div>
                                            {section.title !== "Products Clicked" && (
                                                <a
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        handleViewChatClick(item.conversation_id);
                                                    }}
                                                    className="!text-emerald-600 !visited:text-emerald-600 hover:!text-emerald-700 no-underline transition-colors outline-none whitespace-nowrap text-[14px] font-bold"
                                                >
                                                    View Chat
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {section.total > 5 && (
                            <div className="p-3 bg-gray-50/30 border-t border-gray-100 text-center">
                                <button onClick={() => section.setState(!section.state)} className="text-[8px] font-semibold text-gray-400 hover:text-emerald-600 transition-colors">
                                    {section.state ? "Show Less" : "View All History"}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
