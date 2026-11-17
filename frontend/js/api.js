/**
 * Campus Helpdesk and Issue Tracking System
 * API Integration Module (api.js)
 *
 * Provides configurable endpoints for Python Flask backend integration
 * with intelligent fallback to browser localStorage mock data store.
 */

// =============================================================================
// 1. API Configuration
// =============================================================================
const API_CONFIG = {
  // Configurable Flask backend URL (Change to match your backend host & port)
  BASE_URL: localStorage.getItem('CAMPUS_API_BASE_URL') || 'http://127.0.0.1:5000/api',

  // Request timeout in milliseconds
  TIMEOUT_MS: 5000,

  // Enable local mock data fallback when backend is unreachable
  MOCK_FALLBACK: true,

  // Status tracker
  isBackendConnected: false,

  // Set new base URL dynamically
  setBaseUrl(url) {
    this.BASE_URL = url.trim().replace(/\/+$/, '');
    localStorage.setItem('CAMPUS_API_BASE_URL', this.BASE_URL);
  }
};

// =============================================================================
// 2. Mock Database & Seeding (For demonstration before Flask is connected)
// =============================================================================
const MOCK_STORAGE_KEYS = {
  USERS: 'campus_helpdesk_users',
  COMPLAINTS: 'campus_helpdesk_complaints',
  STAFF: 'campus_helpdesk_staff',
  SESSION: 'campus_helpdesk_session'
};

const DEFAULT_STAFF = [
  { id: 'STF-101', name: 'Rajesh Sharma', department: 'IT & Network Support', email: 'rajesh.it@campus.edu', phone: '+91 98765 43210' },
  { id: 'STF-102', name: 'Sunita Rao', department: 'Hostel Facilities & Warden', email: 'sunita.hostel@campus.edu', phone: '+91 98765 43211' },
  { id: 'STF-103', name: 'Anand Verma', department: 'Electrical & Power Systems', email: 'anand.electrical@campus.edu', phone: '+91 98765 43212' },
  { id: 'STF-104', name: 'Vikram Singh', department: 'Sanitation & Civil Works', email: 'vikram.civil@campus.edu', phone: '+91 98765 43213' },
  { id: 'STF-105', name: 'Dr. Priya Nair', department: 'Library & Academic Affairs', email: 'priya.library@campus.edu', phone: '+91 98765 43214' }
];

const DEFAULT_USERS = [
  {
    id: 'USR-STU-001',
    role: 'student',
    fullName: 'Aarav Patel',
    usn: '1RV21CS042',
    department: 'Computer Science and Engineering',
    year: '3rd Year',
    email: 'student@campus.edu',
    phone: '9845012345',
    password: 'password123'
  },
  {
    id: 'USR-STU-002',
    role: 'student',
    fullName: 'Ananya Sharma',
    usn: '1RV22EC018',
    department: 'Electronics and Communication',
    year: '2nd Year',
    email: 'ananya@campus.edu',
    phone: '9845054321',
    password: 'password123'
  },
  {
    id: 'USR-ADM-001',
    role: 'admin',
    fullName: 'Chief Helpdesk Administrator',
    usn: 'EMP-ADM-09',
    department: 'Campus Administration',
    year: 'N/A',
    email: 'admin@campus.edu',
    phone: '9845000001',
    password: 'admin123'
  }
];

const DEFAULT_COMPLAINTS = [
  {
    id: 'CMP-2026-101',
    studentId: 'USR-STU-001',
    studentName: 'Aarav Patel',
    studentEmail: 'student@campus.edu',
    title: 'Wi-Fi connectivity drop in Central Library 2nd Floor',
    category: 'IT / Wi-Fi',
    location: 'Central Library, 2nd Floor Reading Room',
    priority: 'Urgent',
    status: 'In Progress',
    description: 'The access point AP-LIB-02 frequently drops connections during peak afternoon study hours. More than 40 students are unable to access research databases.',
    imageUrl: '',
    assignedStaffId: 'STF-101',
    assignedStaffName: 'Rajesh Sharma (IT & Network Support)',
    createdAt: '2026-11-15T10:30:00Z',
    updatedAt: '2026-11-16T14:20:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-15 10:30 AM', note: 'Complaint filed by student Aarav Patel.' },
      { status: 'Assigned', timestamp: '2026-11-15 02:15 PM', note: 'Assigned to Rajesh Sharma for on-site router diagnostic.' },
      { status: 'In Progress', timestamp: '2026-11-16 02:20 PM', note: 'Technician replacing faulty transceiver module.' }
    ]
  },
  {
    id: 'CMP-2026-102',
    studentId: 'USR-STU-001',
    studentName: 'Aarav Patel',
    studentEmail: 'student@campus.edu',
    title: 'Water leakage in Hostel Block B 3rd Floor Restroom',
    category: 'Hostel',
    location: 'Boys Hostel B, Room 312 Restroom Wing',
    priority: 'High',
    status: 'Pending',
    description: 'Overhead flush pipeline is continuously leaking water, making the floor slippery and hazardous.',
    imageUrl: '',
    assignedStaffId: null,
    assignedStaffName: 'Unassigned',
    createdAt: '2026-11-16T18:15:00Z',
    updatedAt: '2026-11-16T18:15:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-16 06:15 PM', note: 'Complaint logged. Awaiting admin review and staff assignment.' }
    ]
  },
  {
    id: 'CMP-2026-103',
    studentId: 'USR-STU-001',
    studentName: 'Aarav Patel',
    studentEmail: 'student@campus.edu',
    title: 'Classroom 304 Projector HDMI flickering',
    category: 'Infrastructure',
    location: 'Academic Block 3, Room 304',
    priority: 'Medium',
    status: 'Resolved',
    description: 'HDMI cable connector pins are bent, causing green tint and video dropouts during morning lectures.',
    imageUrl: '',
    assignedStaffId: 'STF-103',
    assignedStaffName: 'Anand Verma (Electrical & Power)',
    createdAt: '2026-11-12T09:00:00Z',
    updatedAt: '2026-11-14T16:00:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-12 09:00 AM', note: 'Complaint registered by student.' },
      { status: 'Assigned', timestamp: '2026-11-12 11:30 AM', note: 'Assigned to Anand Verma.' },
      { status: 'In Progress', timestamp: '2026-11-13 10:00 AM', note: 'New 15-meter shielded HDMI 2.1 cable ordered.' },
      { status: 'Resolved', timestamp: '2026-11-14 04:00 PM', note: 'Cable replaced and projector re-aligned. Tested OK.' }
    ]
  },
  {
    id: 'CMP-2026-104',
    studentId: 'USR-STU-002',
    studentName: 'Ananya Sharma',
    studentEmail: 'ananya@campus.edu',
    title: 'Dangerous loose electrical switchboard in Lab 2',
    category: 'Infrastructure',
    location: 'Electronics Block, Ground Floor Lab 2, Bench 6',
    priority: 'Urgent',
    status: 'In Progress',
    description: 'The main 230V outlet plate is detached with exposed live wires near workbench sink.',
    imageUrl: '',
    assignedStaffId: 'STF-103',
    assignedStaffName: 'Anand Verma (Electrical & Power)',
    createdAt: '2026-11-17T08:45:00Z',
    updatedAt: '2026-11-17T11:10:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-17 08:45 AM', note: 'Urgent safety hazard flagged.' },
      { status: 'Assigned', timestamp: '2026-11-17 09:15 AM', note: 'Immediate priority dispatch to Anand Verma.' },
      { status: 'In Progress', timestamp: '2026-11-17 11:10 AM', note: 'Breaker isolated. Modular faceplate being fitted.' }
    ]
  },
  {
    id: 'CMP-2026-105',
    studentId: 'USR-STU-002',
    studentName: 'Ananya Sharma',
    studentEmail: 'ananya@campus.edu',
    title: 'Drinking water dispenser filter indicator red',
    category: 'Sanitation',
    location: 'Girls Hostel Mess Dining Area',
    priority: 'Medium',
    status: 'Pending',
    description: 'The RO UV filter replacement warning buzzer is active and output flow rate is very low.',
    imageUrl: '',
    assignedStaffId: null,
    assignedStaffName: 'Unassigned',
    createdAt: '2026-11-17T13:00:00Z',
    updatedAt: '2026-11-17T13:00:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-17 01:00 PM', note: 'Complaint logged. Awaiting maintenance allocation.' }
    ]
  },
  {
    id: 'CMP-2026-106',
    studentId: 'USR-STU-001',
    studentName: 'Aarav Patel',
    studentEmail: 'student@campus.edu',
    title: 'Digital library catalog search timeout errors',
    category: 'Academics',
    location: 'Online Web Portal / Campus Intranet',
    priority: 'Low',
    status: 'Resolved',
    description: 'Searching for Springer e-books resulted in SQL timeout 504 Gateway errors.',
    imageUrl: '',
    assignedStaffId: 'STF-105',
    assignedStaffName: 'Dr. Priya Nair (Library & Academic)',
    createdAt: '2026-11-10T14:00:00Z',
    updatedAt: '2026-11-11T17:30:00Z',
    timeline: [
      { status: 'Submitted', timestamp: '2026-11-10 02:00 PM', note: 'Catalog error reported.' },
      { status: 'Assigned', timestamp: '2026-11-10 03:00 PM', note: 'Escalated to IT Systems Librarian.' },
      { status: 'In Progress', timestamp: '2026-11-11 11:00 AM', note: 'Indexing cache cleared and server restarted.' },
      { status: 'Resolved', timestamp: '2026-11-11 05:30 PM', note: 'Query latency restored to normal.' }
    ]
  }
];

function initMockData() {
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.USERS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.COMPLAINTS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.COMPLAINTS, JSON.stringify(DEFAULT_COMPLAINTS));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.STAFF)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
  }
}

// Run initial seed on load
initMockData();

// =============================================================================
// 3. Local Mock Storage CRUD Helpers
// =============================================================================
const mockDB = {
  getUsers() {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.USERS) || '[]');
  },
  saveUsers(users) {
    localStorage.setItem(MOCK_STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  getComplaints() {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.COMPLAINTS) || '[]');
  },
  saveComplaints(complaints) {
    localStorage.setItem(MOCK_STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
  },
  getStaff() {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.STAFF) || '[]');
  },
  getCurrentSession() {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.SESSION) || 'null');
  },
  setSession(user) {
    localStorage.setItem(MOCK_STORAGE_KEYS.SESSION, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(MOCK_STORAGE_KEYS.SESSION);
  }
};

// =============================================================================
// 4. Centralized Network Request Wrapper (Fetch with Mock Fallback)
// =============================================================================
async function request(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const session = mockDB.getCurrentSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(session && session.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
    ...(options.headers || {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    API_CONFIG.isBackendConnected = true;
    updateBackendStatusBadge(true);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    API_CONFIG.isBackendConnected = false;
    updateBackendStatusBadge(false);

    if (API_CONFIG.MOCK_FALLBACK) {
      console.warn(`[CampusAPI] Flask backend unreachable at ${url}. Executing fallback on local mock database.`, error.message);
      return null; // Signals caller to proceed with mock handler
    }
    throw error;
  }
}

// Updates UI status banner if present
function updateBackendStatusBadge(isConnected) {
  const banner = document.getElementById('systemStatusBanner');
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (banner && dot && text) {
    if (isConnected) {
      banner.classList.remove('offline');
      dot.style.backgroundColor = '#10b981';
      text.textContent = `Connected to Python Flask Backend (${API_CONFIG.BASE_URL})`;
    } else {
      banner.classList.add('offline');
      dot.style.backgroundColor = '#f59e0b';
      text.textContent = `Local Mock Data Mode (Flask Backend Ready at ${API_CONFIG.BASE_URL})`;
    }
  }
}

// Format local date/time string
function formatCurrentDateTime() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// =============================================================================
// 5. Exported Application API Services
// =============================================================================
const CampusAPI = {
  config: API_CONFIG,
  mockDB,

  // ---------------------------------------------------------------------------
  // Authentication API
  // ---------------------------------------------------------------------------
  auth: {
    /**
     * Login User (Student or Admin)
     * Backend: POST /api/auth/login
     */
    async login(email, password, role) {
      const payload = { email, password, role };
      const remoteResponse = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (remoteResponse) {
        mockDB.setSession(remoteResponse.user);
        return remoteResponse;
      }

      // --- Local Mock Fallback ---
      const users = mockDB.getUsers();
      const user = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.password === password &&
        u.role === role
      );

      if (!user) {
        throw new Error('Invalid email, password, or role selection. Please check credentials.');
      }

      const sessionUser = {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        usn: user.usn,
        department: user.department,
        year: user.year,
        email: user.email,
        phone: user.phone,
        token: `mock-jwt-token-${Date.now()}`
      };

      mockDB.setSession(sessionUser);
      return {
        success: true,
        message: 'Login successful (Mock Mode)',
        user: sessionUser
      };
    },

    /**
     * Register New Student
     * Backend: POST /api/auth/register
     */
    async register(studentData) {
      const remoteResponse = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(studentData)
      });

      if (remoteResponse) {
        return remoteResponse;
      }

      // --- Local Mock Fallback ---
      const users = mockDB.getUsers();
      const existing = users.find(u => u.email.toLowerCase() === studentData.email.toLowerCase().trim());
      if (existing) {
        throw new Error('An account with this email address is already registered.');
      }

      const existingUsn = users.find(u => u.usn.toUpperCase() === studentData.usn.toUpperCase().trim());
      if (existingUsn) {
        throw new Error('A student with this USN/Student ID already exists.');
      }

      const newStudent = {
        id: `USR-STU-${String(users.length + 1).padStart(3, '0')}`,
        role: 'student',
        fullName: studentData.fullName.trim(),
        usn: studentData.usn.trim().toUpperCase(),
        department: studentData.department,
        year: studentData.year,
        email: studentData.email.trim().toLowerCase(),
        phone: studentData.phone.trim(),
        password: studentData.password
      };

      users.push(newStudent);
      mockDB.saveUsers(users);

      return {
        success: true,
        message: 'Registration successful! You can now log in.',
        user: { id: newStudent.id, email: newStudent.email, fullName: newStudent.fullName }
      };
    },

    /**
     * Logout Current User
     */
    logout() {
      mockDB.clearSession();
    },

    /**
     * Get Current Active Session
     */
    getCurrentUser() {
      return mockDB.getCurrentSession();
    }
  },

  // ---------------------------------------------------------------------------
  // Complaints API
  // ---------------------------------------------------------------------------
  complaints: {
    /**
     * Get list of complaints with optional filtering
     * Backend: GET /api/complaints
     */
    async getAll(filters = {}) {
      const queryString = new URLSearchParams(filters).toString();
      const remoteResponse = await request(`/complaints${queryString ? '?' + queryString : ''}`, {
        method: 'GET'
      });

      if (remoteResponse && remoteResponse.complaints) {
        return remoteResponse.complaints;
      }

      // --- Local Mock Fallback ---
      let complaints = mockDB.getComplaints();

      if (filters.studentId) {
        complaints = complaints.filter(c => c.studentId === filters.studentId);
      }
      if (filters.status && filters.status !== 'All') {
        complaints = complaints.filter(c => c.status.toLowerCase() === filters.status.toLowerCase());
      }
      if (filters.category && filters.category !== 'All') {
        complaints = complaints.filter(c => c.category === filters.category);
      }
      if (filters.priority && filters.priority !== 'All') {
        complaints = complaints.filter(c => c.priority === filters.priority);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        complaints = complaints.filter(c =>
          c.id.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.location.toLowerCase().includes(query)
        );
      }

      // Sort newest first
      complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return complaints;
    },

    /**
     * Get single complaint by ID
     * Backend: GET /api/complaints/{id}
     */
    async getById(id) {
      const remoteResponse = await request(`/complaints/${encodeURIComponent(id)}`, {
        method: 'GET'
      });

      if (remoteResponse && remoteResponse.complaint) {
        return remoteResponse.complaint;
      }

      // --- Local Mock Fallback ---
      const complaints = mockDB.getComplaints();
      const item = complaints.find(c => c.id.toLowerCase() === id.toLowerCase().trim());
      if (!item) {
        throw new Error(`Complaint #${id} not found.`);
      }
      return item;
    },

    /**
     * Submit New Complaint
     * Backend: POST /api/complaints
     */
    async create(complaintData) {
      const remoteResponse = await request('/complaints', {
        method: 'POST',
        body: JSON.stringify(complaintData)
      });

      if (remoteResponse && remoteResponse.complaint) {
        return remoteResponse.complaint;
      }

      // --- Local Mock Fallback ---
      const complaints = mockDB.getComplaints();
      const session = mockDB.getCurrentSession() || {
        id: 'USR-STU-001',
        fullName: 'Student User',
        email: 'student@campus.edu'
      };

      const newId = `CMP-2026-${String(complaints.length + 101)}`;
      const nowIso = new Date().toISOString();
      const formattedDate = formatCurrentDateTime();

      const newComplaint = {
        id: newId,
        studentId: session.id,
        studentName: session.fullName,
        studentEmail: session.email,
        title: complaintData.title.trim(),
        category: complaintData.category,
        location: complaintData.location.trim(),
        priority: complaintData.priority,
        status: 'Pending',
        description: complaintData.description.trim(),
        imageUrl: complaintData.imageUrl || '',
        assignedStaffId: null,
        assignedStaffName: 'Unassigned',
        createdAt: nowIso,
        updatedAt: nowIso,
        timeline: [
          {
            status: 'Submitted',
            timestamp: formattedDate,
            note: `Complaint registered by ${session.fullName}. Initial status set to Pending.`
          }
        ]
      };

      complaints.unshift(newComplaint);
      mockDB.saveComplaints(complaints);

      return newComplaint;
    },

    /**
     * Update Complaint Status
     * Backend: PUT /api/complaints/{id}/status
     */
    async updateStatus(id, newStatus, adminNote = '') {
      const payload = { status: newStatus, note: adminNote };
      const remoteResponse = await request(`/complaints/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (remoteResponse && remoteResponse.complaint) {
        return remoteResponse.complaint;
      }

      // --- Local Mock Fallback ---
      const complaints = mockDB.getComplaints();
      const index = complaints.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Complaint #${id} not found.`);
      }

      complaints[index].status = newStatus;
      complaints[index].updatedAt = new Date().toISOString();

      complaints[index].timeline.push({
        status: newStatus,
        timestamp: formatCurrentDateTime(),
        note: adminNote || `Status updated to ${newStatus} by Administrator.`
      });

      mockDB.saveComplaints(complaints);
      return complaints[index];
    },

    /**
     * Assign Complaint to Staff Member
     * Backend: PUT /api/complaints/{id}/assign
     */
    async assignStaff(id, staffId, staffName, adminNote = '') {
      const payload = { staffId, staffName, note: adminNote };
      const remoteResponse = await request(`/complaints/${encodeURIComponent(id)}/assign`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (remoteResponse && remoteResponse.complaint) {
        return remoteResponse.complaint;
      }

      // --- Local Mock Fallback ---
      const complaints = mockDB.getComplaints();
      const index = complaints.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Complaint #${id} not found.`);
      }

      complaints[index].assignedStaffId = staffId;
      complaints[index].assignedStaffName = staffName;
      if (complaints[index].status === 'Pending') {
        complaints[index].status = 'In Progress';
      }
      complaints[index].updatedAt = new Date().toISOString();

      complaints[index].timeline.push({
        status: 'Assigned',
        timestamp: formatCurrentDateTime(),
        note: adminNote || `Assigned to ${staffName}. Status transitioned to In Progress.`
      });

      mockDB.saveComplaints(complaints);
      return complaints[index];
    },

    /**
     * Update Priority of Complaint
     * Backend: PUT /api/complaints/{id}/priority
     */
    async updatePriority(id, newPriority) {
      const payload = { priority: newPriority };
      const remoteResponse = await request(`/complaints/${encodeURIComponent(id)}/priority`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (remoteResponse && remoteResponse.complaint) {
        return remoteResponse.complaint;
      }

      // --- Local Mock Fallback ---
      const complaints = mockDB.getComplaints();
      const index = complaints.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Complaint #${id} not found.`);
      }

      complaints[index].priority = newPriority;
      complaints[index].updatedAt = new Date().toISOString();
      mockDB.saveComplaints(complaints);
      return complaints[index];
    }
  },

  // ---------------------------------------------------------------------------
  // Staff Directory API
  // ---------------------------------------------------------------------------
  staff: {
    async getAll() {
      const remoteResponse = await request('/staff', { method: 'GET' });
      if (remoteResponse && remoteResponse.staff) {
        return remoteResponse.staff;
      }
      return mockDB.getStaff();
    }
  },

  // ---------------------------------------------------------------------------
  // Dashboard Metrics & Statistics API
  // ---------------------------------------------------------------------------
  stats: {
    async getStudentStats(studentId) {
      const complaints = await CampusAPI.complaints.getAll({ studentId });
      return {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'Pending').length,
        inProgress: complaints.filter(c => c.status === 'In Progress').length,
        resolved: complaints.filter(c => c.status === 'Resolved').length,
        rejected: complaints.filter(c => c.status === 'Rejected').length
      };
    },

    async getAdminStats() {
      const complaints = await CampusAPI.complaints.getAll();
      return {
        total: complaints.length,
        new: complaints.filter(c => c.status === 'Pending' && !c.assignedStaffId).length,
        pending: complaints.filter(c => c.status === 'Pending').length,
        inProgress: complaints.filter(c => c.status === 'In Progress').length,
        resolved: complaints.filter(c => c.status === 'Resolved').length
      };
    }
  }
};

// Make accessible to window object
if (typeof window !== 'undefined') {
  window.CampusAPI = CampusAPI;
}
