import { useNavigate } from "react-router-dom";

export default function Sidebar({ currentTab, onTabChange, user }) {
  const navigate = useNavigate();
  const isDev = process.env.NODE_ENV === "development";
  const tabs = [
    "demo",
  ];

  const tabLabels = {
    live: "Live Conversations",
    analytics: "Analytics",
    leads: "Leads",
    demo: "Demo",
  };

  return (
    <div
      className="w-56 h-screen flex flex-col"
      style={{
        backgroundColor: "var(--primary-bg)",
        borderRight: "1px solid var(--primary-border)",
      }}
    >
      {/* Navigation Items */}
      <nav className="flex-1 px-3.5 py-6">
        <ul className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <li key={tab}>
              <button
                onClick={() => onTabChange(tab)}
                className={`sidebar-tab w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentTab === tab ? "active" : ""
                }`}
                style={{
                  backgroundColor:
                    currentTab === tab
                      ? "var(--sidebar-tab-active-bg)"
                      : "var(--primary-bg)",
                  color:
                    currentTab === tab
                      ? "var(--accent-green)"
                      : "var(--color-gray-800)",
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: "var(--sidebar-tab-icon)" }}
                >
                  {/* Add your SVG paths here */}
                </svg>
                <span className="text-sm">{tabLabels[tab]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile Section - Only show when logged in */}
      {user && (
        <div
          className="px-3.5 py-4"
          style={{ borderTop: "1px solid var(--primary-border)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* User Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--accent-green-bg)",
                color: "var(--accent-green)",
              }}
            >
              <span className="text-xs font-medium">
                {user?.email
                  ? user.email
                      .split("@")[0]
                      .split(/[\s.]+/)
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase() || "")
                      .join("")
                  : "U"}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate"
                style={{ color: "var(--color-gray-800)" }}
              >
                {user?.name}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--secondary-text)" }}
              >
                Admin
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}