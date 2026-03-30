import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeads } from "../api";
import { toSydneyTime } from "../utils";

const sydneyTimeZoneNameFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

function getSydneyTimeAbbr(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  const parts = sydneyTimeZoneNameFormatter.formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
}

export default function LeadsPage({ 
  onToggleDetails, 
  onViewChat, 
  dateFilter = {}, 
  selectedLead, 
  setSelectedLead 
}) {
  const [leads, setLeads] = useState([]);
  const [uniqueLeads, setUniqueLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        const data = await getLeads(100, dateFilter.from, dateFilter.to);
        setLeads(data?.collectedCustomers?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [dateFilter.from, dateFilter.to]);

  useEffect(() => {

    async function fetchUniqueLeads() {
      const uniqueMap = new Map();
      for (const lead of leads) {
        if (lead.visitor_id && !uniqueMap.has(lead.visitor_id)) {
          uniqueMap.set(lead.visitor_id, lead);
        }
      }
      setUniqueLeads(Array.from(uniqueMap.values()));
    }

    fetchUniqueLeads();

  }, [leads]);

  const navigate = useNavigate();

  // --- navigation and selection header ---
  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    if (onToggleDetails) onToggleDetails(true);
    navigate(`/leads/${encodeURIComponent(lead.id)}`, { state: { lead } });
  };

  // --- search and filter logic ---
  const filteredLeads = uniqueLeads.filter((lead) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.toLowerCase().includes(search)
    );
  });

  const visibleSydneyAbbrs = new Set(
    filteredLeads
      .map((lead) => getSydneyTimeAbbr(lead.created_at))
      .filter(Boolean)
  );

  const capturedAtHeading = visibleSydneyAbbrs.size === 1
    ? `Captured At (Sydney / ${[...visibleSydneyAbbrs][0]})`
    : "Captured At (Sydney time)";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 animate-spin border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex p-5 flex-col bg-gray-50">
      <div className="w-full">
        <div className="grid grid-cols-2 gap-4" style={{ maxWidth: "1168px" }}>
          <div className="rounded-2xl border p-5 bg-white border-gray-200">
            <div className="text-sm font-semibold mb-2 text-gray-800">Total Leads</div>
            <div className="text-3xl font-semibold text-gray-900">{uniqueLeads.length}</div>
          </div>
          <div className="rounded-2xl border p-5 bg-white border-gray-200">
            <div className="text-sm font-semibold mb-2 text-gray-800">With Email</div>
            <div className="text-3xl font-semibold text-gray-900">
              {uniqueLeads.filter((l) => l.email).length}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5 flex-1 overflow-hidden">
        <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm h-full flex flex-col" style={{ maxWidth: "1168px" }}>
          <div className="px-5 py-4 border-b border-slate-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-slate-900 font-semibold">Captured Leads ({filteredLeads.length})</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-12 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">{capturedAtHeading}</th>
                  <th className="px-5 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-16 text-center text-sm text-gray-500" style={{ textAlign: "center" }}>
                      No leads found
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">
                            {lead.name && lead.name.trim() ? lead.name.trim()[0].toUpperCase() : "?"}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {lead.name && lead.name.trim() ? lead.name : "Anonymous Visitor"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{lead.email || "Email not found"}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{lead.created_at ? toSydneyTime(lead.created_at) : "—"}</td>
                      <td className="px-5 py-4 text-left">
                        <span className="py-1 rounded-md text-sm font-semibold text-emerald-600">
                          View Details
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
