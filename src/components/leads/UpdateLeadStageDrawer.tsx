import { useState, useEffect } from 'react';
import { store } from '@/store';
import axios from 'axios';
import { toast } from 'react-hot-toast'; // or react-toastify, I'll use toastify since it's in LeadViewDialog
import { baseUrl, getAuthToken } from '@/config';
import { ApiLead, ApiStatus } from './types';
import { X } from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: ApiLead | null;
  onSuccess: () => void;
}

export default function UpdateLeadStageDrawer({ isOpen, onClose, lead, onSuccess }: Props) {
  const [mode, setMode] = useState<'done' | 'stage' | 'next'>('next');
  
  // State for "Stage"
  const [statuses, setStatuses] = useState<ApiStatus[]>([]);
  const [selectedStage, setSelectedStage] = useState('');

  // State for "Next Follow up"
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('next');
      setSelectedStage(lead?.leadStatus?._id || '');
      setNextDate('');
      setNextTime('');
      setNote('');
      fetchStatuses();
    }
  }, [isOpen, lead]);

  const isWon = lead?.leadStatus?.name?.toLowerCase() === 'won' || (lead as any)?.status?.name?.toLowerCase() === 'won' || (lead as any)?.isWon;

  const fetchStatuses = async () => {
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const res = await axios.get(baseUrl.leadStatuses, { headers });
      if (res.data?.data) {
        setStatuses(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching statuses', err);
    }
  };

  const handleSubmit = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      let payload: any = {};

      if (mode === 'done') {
        // Find "Won" status or just mark it
        const wonStatus = statuses.find(s => s.name.toLowerCase() === 'won');
        if (wonStatus) {
          payload.leadStatus = wonStatus._id;
        }
        payload.nextFollowupDate = "";
        payload.nextFollowupTime = "";
      } else if (mode === 'stage') {
        if (!selectedStage) {
          toast.error("Please select a stage");
          setSaving(false);
          return;
        }
        payload.leadStatus = selectedStage;
      } else if (mode === 'next') {
        if (!nextDate || !note) {
          toast.error("Please fill required fields (Date and Note)");
          setSaving(false);
          return;
        }
        
        // Fetch current user info if needed for followup
        let staffInfo = undefined;
        try {
          const authState = store.getState().auth;
          if (authState.user) {
            staffInfo = {
              _id: authState.user._id,
              fullName: authState.user.fullName
            };
          }
        } catch (e) {
          console.error("Failed to get current staff for followup", e);
        }

        const newFollowup = {
          date: nextDate,
          time: nextTime,
          note: note,
          staff: staffInfo
        };
        
        // Ensure existing followups are retained
        const existingFollowUps = lead.followUps || [];
        payload.followUps = [...existingFollowUps, newFollowup];
        payload.nextFollowupDate = nextDate;
        payload.nextFollowupTime = nextTime;
        payload.lastFollowUp = new Date().toISOString().split('T')[0];
      }

      await axios.put(`${baseUrl.updateLead}/${lead._id}`, payload, { headers });
      toast.success("Lead updated successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] transform transition-transform duration-300">
        <div className="flex flex-col h-full bg-white relative">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Lead</h2>
              <p className="text-sm text-gray-500 mt-1">{lead?.fullName || (lead as any)?.customerName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isWon ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                This lead is currently <strong>Won</strong> and cannot be updated.
              </div>
            ) : (
              <>
                {/* Radio Options */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input 
                      type="radio" 
                      name="stageMode" 
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                      checked={mode === 'done'}
                      onChange={() => setMode('done')}
                    />
                    Follow Up Done
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input 
                      type="radio" 
                      name="stageMode" 
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                      checked={mode === 'stage'}
                      onChange={() => setMode('stage')}
                    />
                    Stage
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input 
                      type="radio" 
                      name="stageMode" 
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                      checked={mode === 'next'}
                      onChange={() => setMode('next')}
                    />
                    Next Follow up
                  </label>
                </div>

                <hr className="border-gray-100" />

                {/* Dynamic Content */}
                <div className="min-h-[200px]">
                  {mode === 'done' && (
                    <div className="p-4 bg-green-50/50 border border-green-200 rounded-xl text-green-800 text-sm">
                      This will mark the lead as <strong>Won</strong> and clear the upcoming follow-up.
                    </div>
                  )}

                  {mode === 'stage' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Select Stage</label>
                      <div className="relative">
                        <select 
                          className="w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg border appearance-none bg-white"
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                        >
                          <option value="" disabled>Select a stage</option>
                          {statuses.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'next' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Next Followup Date <span className="text-red-500">*</span>
                          </label>
                          <DatePicker
                            value={nextDate}
                            onChange={(val) => setNextDate(val)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Next Followup Time
                          </label>
                          <TimePicker
                            value={nextTime}
                            onChange={(val) => setNextTime(val)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Note <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          rows={4}
                          placeholder="Enter note.."
                          className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary focus:border-primary py-2 px-3 border resize-none"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!isWon && (
              <button 
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Lead'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
