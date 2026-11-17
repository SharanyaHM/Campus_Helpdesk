/**
 * Campus Helpdesk and Issue Tracking System
 * Main JavaScript Controller (script.js)
 *
 * ES6+ Vanilla JavaScript for form validations, view management,
 * dashboard metrics, complaint workflows, and UI interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  // Current active view
  currentView: 'login',

  // Current logged in user
  currentUser: null,

  // Cache of complaints & staff
  complaintsCache: [],
  staffCache: [],

  // ===========================================================================
  // Initialization
  // ===========================================================================
  init() {
    this.currentUser = CampusAPI.auth.getCurrentUser();
    this.bindGlobalEvents();
    this.initRouter();
    this.updateUIForUser();
  },

  // ===========================================================================
  // Global Event Bindings
  // ===========================================================================
  bindGlobalEvents() {
    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('appSidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Role switcher pills (Student <-> Admin quick switch for project demo)
    const rolePills = document.querySelectorAll('.role-pill-btn');
    rolePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const targetRole = pill.dataset.role;
        this.demoSwitchRole(targetRole);
      });
    });

    // Password visibility toggle buttons
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetInputId = btn.dataset.target;
        this.togglePasswordVisibility(targetInputId, btn);
      });
    });

    // API Config modal trigger
    const apiConfigBtn = document.getElementById('apiConfigTrigger');
    if (apiConfigBtn) {
      apiConfigBtn.addEventListener('click', () => this.openApiConfigModal());
    }

    // File input preview on submit complaint form
    const complaintImageInput = document.getElementById('complaintImage');
    if (complaintImageInput) {
      complaintImageInput.addEventListener('change', (e) => this.handleImagePreview(e));
    }

    // Hash change event for router
    window.addEventListener('hashchange', () => this.handleHashChange());
  },

  // ===========================================================================
  // Router & View Management
  // ===========================================================================
  initRouter() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      this.navigateTo(hash);
    } else {
      // Default view based on auth state
      if (this.currentUser) {
        this.navigateTo(this.currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard');
      } else {
        this.navigateTo('login');
      }
    }
  },

  handleHashChange() {
    const rawHash = window.location.hash.substring(1);
    if (!rawHash) return;

    const [viewName, queryString] = rawHash.split('?');
    const params = new URLSearchParams(queryString || '');
    this.renderView(viewName, params);
  },

  navigateTo(viewName, params = {}) {
    let url = `#${viewName}`;
    const search = new URLSearchParams(params).toString();
    if (search) {
      url += `?${search}`;
    }
    window.location.hash = url;
  },

  renderView(viewName, params = new URLSearchParams()) {
    this.currentView = viewName;

    // Check auth guards
    const isAuthView = viewName === 'login' || viewName === 'register';
    if (!isAuthView && !this.currentUser) {
      this.showToast('Please sign in to access this page.', 'error');
      this.navigateTo('login');
      return;
    }

    // Check role guards
    if (this.currentUser) {
      if (viewName.startsWith('admin') && this.currentUser.role !== 'admin') {
        this.showToast('Access restricted: Administrator privilege required.', 'error');
        this.navigateTo('student-dashboard');
        return;
      }
    }

    // Hide all view containers
    const allViews = document.querySelectorAll('.page-view');
    allViews.forEach(v => v.classList.add('d-none'));

    // Show target view
    const targetEl = document.getElementById(`view-${viewName}`);
    if (targetEl) {
      targetEl.classList.remove('d-none');
    }

    // Update Layout (Hide sidebar/header on login and register)
    const sidebar = document.getElementById('appSidebar');
    const header = document.getElementById('appHeader');
    const mainContainer = document.getElementById('appMain');

    if (isAuthView) {
      if (sidebar) sidebar.classList.add('d-none');
      if (header) header.classList.add('d-none');
      if (mainContainer) mainContainer.style.marginLeft = '0';
    } else {
      if (sidebar) sidebar.classList.remove('d-none');
      if (header) header.classList.remove('d-none');
      if (mainContainer) mainContainer.style.marginLeft = '';
      this.updateSidebarNavigation(viewName);

      // Update header page title
      const pageTitles = {
        'student-dashboard': 'Student Dashboard',
        'submit-complaint': 'Submit Campus Complaint',
        'my-complaints': 'My Complaints',
        'track-complaint': 'Complaint Tracking & Timeline',
        'admin-dashboard': 'Campus Administration Dashboard',
        'admin-complaints': 'Complaint Management Console'
      };
      const titleEl = document.getElementById('pageHeadingTitle');
      if (titleEl && pageTitles[viewName]) {
        titleEl.textContent = pageTitles[viewName];
      }
    }

    // Trigger view-specific data loaders
    switch (viewName) {
      case 'student-dashboard':
        this.loadStudentDashboard();
        break;
      case 'submit-complaint':
        this.resetComplaintForm();
        break;
      case 'my-complaints':
        this.loadMyComplaints();
        break;
      case 'track-complaint':
        const complaintId = params.get('id');
        this.loadComplaintTracking(complaintId);
        break;
      case 'admin-dashboard':
        this.loadAdminDashboard();
        break;
      case 'admin-complaints':
        this.loadAdminComplaintsTable();
        break;
    }

    // Close mobile menu if open
    if (sidebar) sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateSidebarNavigation(activeView) {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      const target = item.dataset.view;
      if (target === activeView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle student/admin sidebar links based on role
    const studentLinks = document.querySelectorAll('.nav-role-student');
    const adminLinks = document.querySelectorAll('.nav-role-admin');

    if (this.currentUser && this.currentUser.role === 'admin') {
      studentLinks.forEach(el => el.classList.add('d-none'));
      adminLinks.forEach(el => el.classList.remove('d-none'));
    } else {
      studentLinks.forEach(el => el.classList.remove('d-none'));
      adminLinks.forEach(el => el.classList.add('d-none'));
    }
  },

  updateUIForUser() {
    const userNameElements = document.querySelectorAll('.display-user-name');
    const userRoleElements = document.querySelectorAll('.display-user-role');
    const userAvatarElements = document.querySelectorAll('.display-user-avatar');

    if (this.currentUser) {
      userNameElements.forEach(el => el.textContent = this.currentUser.fullName);
      userRoleElements.forEach(el => el.textContent = this.currentUser.role.toUpperCase());
      userAvatarElements.forEach(el => {
        el.textContent = this.currentUser.fullName.charAt(0).toUpperCase();
      });

      // Update role switcher pill active state
      document.querySelectorAll('.role-pill-btn').forEach(btn => {
        if (btn.dataset.role === this.currentUser.role) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  },

  // ===========================================================================
  // Demo Role Switcher (For quick presentation testing)
  // ===========================================================================
  async demoSwitchRole(targetRole) {
    if (this.currentUser && this.currentUser.role === targetRole) return;

    if (targetRole === 'admin') {
      await CampusAPI.auth.login('admin@campus.edu', 'admin123', 'admin');
      this.currentUser = CampusAPI.auth.getCurrentUser();
      this.showToast('Switched to Administrator Mode (Chief Helpdesk Administrator)', 'info');
      this.updateUIForUser();
      this.navigateTo('admin-dashboard');
    } else {
      await CampusAPI.auth.login('student@campus.edu', 'password123', 'student');
      this.currentUser = CampusAPI.auth.getCurrentUser();
      this.showToast('Switched to Student Mode (Aarav Patel)', 'info');
      this.updateUIForUser();
      this.navigateTo('student-dashboard');
    }
  },

  // ===========================================================================
  // Authentication Handling (Phase 2)
  // ===========================================================================
  togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>`;
    } else {
      input.type = 'password';
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const roleInput = document.querySelector('input[name="loginRole"]:checked');
    const role = roleInput ? roleInput.value : 'student';

    // Basic Validation
    let isValid = true;
    if (!this.isValidEmail(email)) {
      this.setFieldError('loginEmail', 'Please enter a valid campus email address.');
      isValid = false;
    } else {
      this.clearFieldError('loginEmail');
    }

    if (!password) {
      this.setFieldError('loginPassword', 'Please enter your password.');
      isValid = false;
    } else {
      this.clearFieldError('loginPassword');
    }

    if (!isValid) return;

    const submitBtn = document.getElementById('loginSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';
    }

    try {
      const response = await CampusAPI.auth.login(email, password, role);
      this.currentUser = response.user;
      this.showToast(`Welcome back, ${response.user.fullName}!`, 'success');
      this.updateUIForUser();
      this.navigateTo(role === 'admin' ? 'admin-dashboard' : 'student-dashboard');
    } catch (error) {
      this.showToast(error.message, 'error');
      this.setFieldError('loginPassword', error.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const usn = document.getElementById('regUsn').value.trim();
    const department = document.getElementById('regDepartment').value;
    const year = document.getElementById('regYear').value;
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    let isValid = true;

    if (!fullName || fullName.length < 3) {
      this.setFieldError('regFullName', 'Please enter your full name (minimum 3 characters).');
      isValid = false;
    } else {
      this.clearFieldError('regFullName');
    }

    if (!usn || usn.length < 5) {
      this.setFieldError('regUsn', 'Please enter a valid USN / Student ID.');
      isValid = false;
    } else {
      this.clearFieldError('regUsn');
    }

    if (!department) {
      this.setFieldError('regDepartment', 'Please select your department.');
      isValid = false;
    } else {
      this.clearFieldError('regDepartment');
    }

    if (!year) {
      this.setFieldError('regYear', 'Please select your year of study.');
      isValid = false;
    } else {
      this.clearFieldError('regYear');
    }

    if (!this.isValidEmail(email)) {
      this.setFieldError('regEmail', 'Please enter a valid email address.');
      isValid = false;
    } else {
      this.clearFieldError('regEmail');
    }

    if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      this.setFieldError('regPhone', 'Please enter a valid 10-digit mobile number.');
      isValid = false;
    } else {
      this.clearFieldError('regPhone');
    }

    if (!password || password.length < 6) {
      this.setFieldError('regPassword', 'Password must be at least 6 characters long.');
      isValid = false;
    } else {
      this.clearFieldError('regPassword');
    }

    if (password !== confirmPassword) {
      this.setFieldError('regConfirmPassword', 'Passwords do not match.');
      isValid = false;
    } else {
      this.clearFieldError('regConfirmPassword');
    }

    if (!isValid) return;

    const submitBtn = document.getElementById('registerSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
    }

    try {
      const studentData = { fullName, usn, department, year, email, phone, password };
      const res = await CampusAPI.auth.register(studentData);
      this.showToast(res.message, 'success');
      this.navigateTo('login');
      // Pre-fill email on login page
      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) loginEmailInput.value = email;
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Student Account';
      }
    }
  },

  handleLogout() {
    CampusAPI.auth.logout();
    this.currentUser = null;
    this.showToast('You have been logged out securely.', 'info');
    this.navigateTo('login');
  },

  // ===========================================================================
  // Student Module (Phase 3 & Phase 4)
  // ===========================================================================
  async loadStudentDashboard() {
    if (!this.currentUser) return;
    try {
      const stats = await CampusAPI.stats.getStudentStats(this.currentUser.id);
      document.getElementById('studentTotalCount').textContent = stats.total;
      document.getElementById('studentPendingCount').textContent = stats.pending;
      document.getElementById('studentInProgressCount').textContent = stats.inProgress;
      document.getElementById('studentResolvedCount').textContent = stats.resolved;

      // Welcome header
      const welcomeEl = document.getElementById('studentWelcomeMessage');
      if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${this.currentUser.fullName}`;
      }

      // Load recent complaints table (top 5)
      const complaints = await CampusAPI.complaints.getAll({ studentId: this.currentUser.id });
      this.renderTableRows('studentRecentTableBody', complaints.slice(0, 5), true);
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    }
  },

  async loadMyComplaints() {
    if (!this.currentUser) return;

    const searchInput = document.getElementById('myComplaintsSearch');
    const categoryFilter = document.getElementById('myComplaintsCategoryFilter');
    const statusFilter = document.getElementById('myComplaintsStatusFilter');
    const priorityFilter = document.getElementById('myComplaintsPriorityFilter');

    const filters = {
      studentId: this.currentUser.id,
      search: searchInput ? searchInput.value.trim() : '',
      category: categoryFilter ? categoryFilter.value : 'All',
      status: statusFilter ? statusFilter.value : 'All',
      priority: priorityFilter ? priorityFilter.value : 'All'
    };

    try {
      const complaints = await CampusAPI.complaints.getAll(filters);
      this.renderTableRows('myComplaintsTableBody', complaints, false);
      const countEl = document.getElementById('myComplaintsResultCount');
      if (countEl) countEl.textContent = `Showing ${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`;
    } catch (err) {
      console.error('Error loading complaints list:', err);
    }
  },

  resetComplaintForm() {
    const form = document.getElementById('submitComplaintForm');
    if (form) form.reset();
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.classList.add('d-none');
    this.uploadedImageBase64 = '';
  },

  handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('Image size must be less than 5MB.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.uploadedImageBase64 = event.target.result;
      const previewImg = document.getElementById('imagePreviewImg');
      const previewContainer = document.getElementById('imagePreviewContainer');
      const previewFilename = document.getElementById('imagePreviewFilename');

      if (previewImg && previewContainer) {
        previewImg.src = this.uploadedImageBase64;
        if (previewFilename) previewFilename.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        previewContainer.classList.remove('d-none');
      }
    };
    reader.readAsDataURL(file);
  },

  removeImagePreview() {
    this.uploadedImageBase64 = '';
    const fileInput = document.getElementById('complaintImage');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.classList.add('d-none');
  },

  async handleComplaintSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('complaintTitle').value.trim();
    const category = document.getElementById('complaintCategory').value;
    const location = document.getElementById('complaintLocation').value.trim();
    const priority = document.getElementById('complaintPriority').value;
    const description = document.getElementById('complaintDescription').value.trim();

    let isValid = true;
    if (!title || title.length < 5) {
      this.setFieldError('complaintTitle', 'Please enter a descriptive title (at least 5 characters).');
      isValid = false;
    } else {
      this.clearFieldError('complaintTitle');
    }

    if (!category) {
      this.setFieldError('complaintCategory', 'Please choose an issue category.');
      isValid = false;
    } else {
      this.clearFieldError('complaintCategory');
    }

    if (!location) {
      this.setFieldError('complaintLocation', 'Please specify the exact campus location.');
      isValid = false;
    } else {
      this.clearFieldError('complaintLocation');
    }

    if (!priority) {
      this.setFieldError('complaintPriority', 'Please select an urgency level.');
      isValid = false;
    } else {
      this.clearFieldError('complaintPriority');
    }

    if (!description || description.length < 15) {
      this.setFieldError('complaintDescription', 'Please provide detailed complaint information (min 15 characters).');
      isValid = false;
    } else {
      this.clearFieldError('complaintDescription');
    }

    if (!isValid) return;

    const submitBtn = document.getElementById('submitComplaintBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Ticket...';
    }

    try {
      const payload = {
        title,
        category,
        location,
        priority,
        description,
        imageUrl: this.uploadedImageBase64 || ''
      };

      const newComplaint = await CampusAPI.complaints.create(payload);
      this.showToast(`Complaint #${newComplaint.id} registered successfully!`, 'success');
      this.navigateTo('track-complaint', { id: newComplaint.id });
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Complaint';
      }
    }
  },

  async loadComplaintTracking(complaintId) {
    const container = document.getElementById('trackingContentArea');
    if (!container) return;

    if (!complaintId) {
      container.innerHTML = `
        <div class="panel-card">
          <div class="panel-body text-center" style="padding: 40px;">
            <p class="text-muted">No complaint ID provided. Please select a complaint from "My Complaints" to track its progress.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="App.navigateTo('my-complaints')">View My Complaints</button>
          </div>
        </div>`;
      return;
    }

    try {
      const complaint = await CampusAPI.complaints.getById(complaintId);
      container.innerHTML = `
        <div class="panel-card" style="margin-bottom: 24px;">
          <div class="panel-header">
            <div>
              <span class="text-xs font-semibold text-muted">COMPLAINT TICKET</span>
              <h2 style="font-size: 1.3rem; margin-top: 4px;">#${complaint.id}: ${this.escapeHtml(complaint.title)}</h2>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="badge ${this.getStatusBadgeClass(complaint.status)}">${complaint.status}</span>
              <span class="badge ${this.getPriorityBadgeClass(complaint.priority)}">${complaint.priority} Priority</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-row" style="margin-bottom: 20px;">
              <div>
                <span class="text-xs text-muted font-semibold">CATEGORY</span>
                <p class="font-semibold" style="margin-top: 2px;">${complaint.category}</p>
              </div>
              <div>
                <span class="text-xs text-muted font-semibold">CAMPUS LOCATION</span>
                <p class="font-semibold" style="margin-top: 2px;">${this.escapeHtml(complaint.location)}</p>
              </div>
              <div>
                <span class="text-xs text-muted font-semibold">SUBMITTED ON</span>
                <p class="font-semibold" style="margin-top: 2px;">${this.formatDateTime(complaint.createdAt)}</p>
              </div>
              <div>
                <span class="text-xs text-muted font-semibold">ASSIGNED STAFF MEMBER</span>
                <p class="font-semibold" style="margin-top: 2px; color: ${complaint.assignedStaffId ? 'var(--primary-700)' : 'var(--neutral-500)'};">
                  ${complaint.assignedStaffName || 'Unassigned'}
                </p>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <span class="text-xs text-muted font-semibold">PROBLEM DESCRIPTION</span>
              <div style="background-color: var(--neutral-50); border: 1px solid var(--neutral-200); border-radius: var(--border-radius-md); padding: 14px; margin-top: 6px; font-size: 0.9375rem;">
                ${this.escapeHtml(complaint.description)}
              </div>
            </div>

            ${complaint.imageUrl ? `
              <div style="margin-bottom: 20px;">
                <span class="text-xs text-muted font-semibold">ATTACHED PHOTO EVIDENCE</span>
                <div style="margin-top: 8px;">
                  <img src="${complaint.imageUrl}" alt="Complaint Photo" style="max-height: 250px; border-radius: var(--border-radius-md); border: 1px solid var(--neutral-200);">
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">Progress & Resolution Timeline</h3>
          </div>
          <div class="panel-body">
            <div class="timeline">
              ${this.buildTimelineHtml(complaint)}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="panel-card">
          <div class="panel-body text-center" style="padding: 40px;">
            <p style="color: #dc2626; font-weight: 600;">${err.message}</p>
            <button class="btn btn-outline" style="margin-top: 16px;" onclick="App.navigateTo('my-complaints')">Back to Complaints</button>
          </div>
        </div>`;
    }
  },

  buildTimelineHtml(complaint) {
    if (!complaint.timeline || complaint.timeline.length === 0) {
      return '<p class="text-muted">No timeline entries available.</p>';
    }

    return complaint.timeline.map((entry, idx) => {
      let markerClass = 'completed';
      if (idx === complaint.timeline.length - 1 && complaint.status !== 'Resolved') {
        markerClass = 'active';
      }
      if (entry.status === 'Rejected') {
        markerClass = 'rejected';
      }

      return `
        <div class="timeline-step ${markerClass}">
          <div class="timeline-marker"></div>
          <div class="timeline-step-header">
            <div class="timeline-step-title">${entry.status}</div>
            <div class="timeline-step-time">${entry.timestamp}</div>
          </div>
          <div class="timeline-step-desc">${this.escapeHtml(entry.note)}</div>
        </div>
      `;
    }).join('');
  },

  // ===========================================================================
  // Admin Module (Phase 5)
  // ===========================================================================
  async loadAdminDashboard() {
    try {
      const stats = await CampusAPI.stats.getAdminStats();
      document.getElementById('adminTotalCount').textContent = stats.total;
      document.getElementById('adminNewCount').textContent = stats.new;
      document.getElementById('adminPendingCount').textContent = stats.pending;
      document.getElementById('adminInProgressCount').textContent = stats.inProgress;
      document.getElementById('adminResolvedCount').textContent = stats.resolved;

      const complaints = await CampusAPI.complaints.getAll();
      this.renderAdminRecentTable('adminRecentTableBody', complaints.slice(0, 5));
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  },

  async loadAdminComplaintsTable() {
    const searchInput = document.getElementById('adminComplaintsSearch');
    const categoryFilter = document.getElementById('adminCategoryFilter');
    const statusFilter = document.getElementById('adminStatusFilter');
    const priorityFilter = document.getElementById('adminPriorityFilter');

    const filters = {
      search: searchInput ? searchInput.value.trim() : '',
      category: categoryFilter ? categoryFilter.value : 'All',
      status: statusFilter ? statusFilter.value : 'All',
      priority: priorityFilter ? priorityFilter.value : 'All'
    };

    try {
      const complaints = await CampusAPI.complaints.getAll(filters);
      this.renderAdminManagementTable('adminComplaintsTableBody', complaints);
      const countEl = document.getElementById('adminComplaintsCount');
      if (countEl) countEl.textContent = `Showing ${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`;
    } catch (err) {
      console.error('Error loading admin complaints:', err);
    }
  },

  renderAdminManagementTable(tbodyId, complaints) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (complaints.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="8">No campus complaints match your active filter criteria.</td>
        </tr>`;
      return;
    }

    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td>
          <a href="javascript:void(0)" class="complaint-id-link" onclick="App.openComplaintDetailsModal('${c.id}')">${c.id}</a>
        </td>
        <td>
          <div class="complaint-title-cell" title="${this.escapeHtml(c.title)}">${this.escapeHtml(c.title)}</div>
          <div class="text-xs text-muted">${c.studentName} (${c.studentEmail})</div>
        </td>
        <td><span class="badge badge-category">${c.category}</span></td>
        <td class="text-xs text-muted">${this.formatDate(c.createdAt)}</td>
        <td><span class="badge ${this.getPriorityBadgeClass(c.priority)}">${c.priority}</span></td>
        <td><span class="badge ${this.getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td class="text-xs" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${c.assignedStaffName || '<span class="text-muted">Unassigned</span>'}
        </td>
        <td>
          <div class="d-flex align-center gap-2">
            <button class="btn btn-secondary btn-sm" title="Assign Staff" onclick="App.openAssignModal('${c.id}')">
              Assign
            </button>
            <button class="btn btn-primary btn-sm" title="Update Status" onclick="App.openStatusModal('${c.id}')">
              Update
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderAdminRecentTable(tbodyId, complaints) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (complaints.length === 0) {
      tbody.innerHTML = '<tr class="empty-state-row"><td colspan="6">No recent complaints found.</td></tr>';
      return;
    }

    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td><a href="javascript:void(0)" class="complaint-id-link" onclick="App.openComplaintDetailsModal('${c.id}')">${c.id}</a></td>
        <td class="complaint-title-cell">${this.escapeHtml(c.title)}</td>
        <td><span class="badge badge-category">${c.category}</span></td>
        <td><span class="badge ${this.getPriorityBadgeClass(c.priority)}">${c.priority}</span></td>
        <td><span class="badge ${this.getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="App.openComplaintDetailsModal('${c.id}')">View</button>
        </td>
      </tr>
    `).join('');
  },

  // ===========================================================================
  // Admin Action Modals (Assign Staff, Update Status)
  // ===========================================================================
  async openAssignModal(complaintId) {
    try {
      const complaint = await CampusAPI.complaints.getById(complaintId);
      const staffList = await CampusAPI.staff.getAll();

      document.getElementById('assignModalComplaintId').value = complaint.id;
      document.getElementById('assignModalComplaintTitle').textContent = `#${complaint.id}: ${complaint.title}`;

      const staffSelect = document.getElementById('assignModalStaffSelect');
      staffSelect.innerHTML = `
        <option value="">-- Choose Staff Specialist --</option>
        ${staffList.map(s => `
          <option value="${s.id}" data-name="${s.name} (${s.department})" ${complaint.assignedStaffId === s.id ? 'selected' : ''}>
            ${s.name} - ${s.department}
          </option>
        `).join('')}
      `;

      document.getElementById('assignModalNote').value = '';
      this.openModal('modalAssignStaff');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleAssignStaffSubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('assignModalComplaintId').value;
    const staffSelect = document.getElementById('assignModalStaffSelect');
    const selectedOption = staffSelect.options[staffSelect.selectedIndex];

    if (!selectedOption || !selectedOption.value) {
      this.showToast('Please select a staff member to assign.', 'error');
      return;
    }

    const staffId = selectedOption.value;
    const staffName = selectedOption.dataset.name;
    const note = document.getElementById('assignModalNote').value.trim();

    try {
      await CampusAPI.complaints.assignStaff(complaintId, staffId, staffName, note);
      this.showToast(`Complaint #${complaintId} assigned to ${staffName}!`, 'success');
      this.closeModal('modalAssignStaff');
      this.loadAdminComplaintsTable();
      this.loadAdminDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openStatusModal(complaintId) {
    try {
      const complaint = await CampusAPI.complaints.getById(complaintId);
      document.getElementById('statusModalComplaintId').value = complaint.id;
      document.getElementById('statusModalComplaintTitle').textContent = `#${complaint.id}: ${complaint.title}`;
      document.getElementById('statusModalStatusSelect').value = complaint.status;
      document.getElementById('statusModalPrioritySelect').value = complaint.priority;
      document.getElementById('statusModalNote').value = '';

      this.openModal('modalUpdateStatus');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleStatusUpdateSubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('statusModalComplaintId').value;
    const newStatus = document.getElementById('statusModalStatusSelect').value;
    const newPriority = document.getElementById('statusModalPrioritySelect').value;
    const note = document.getElementById('statusModalNote').value.trim();

    try {
      await CampusAPI.complaints.updateStatus(complaintId, newStatus, note);
      await CampusAPI.complaints.updatePriority(complaintId, newPriority);

      this.showToast(`Complaint #${complaintId} updated to status "${newStatus}".`, 'success');
      this.closeModal('modalUpdateStatus');
      this.loadAdminComplaintsTable();
      this.loadAdminDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ===========================================================================
  // Complaint Details & Full Tracking Modal
  // ===========================================================================
  async openComplaintDetailsModal(complaintId) {
    try {
      const complaint = await CampusAPI.complaints.getById(complaintId);
      const modalBody = document.getElementById('detailsModalContent');

      modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div class="d-flex align-center justify-between" style="margin-bottom: 8px;">
            <span class="badge ${this.getStatusBadgeClass(complaint.status)}">${complaint.status}</span>
            <span class="badge ${this.getPriorityBadgeClass(complaint.priority)}">${complaint.priority} Priority</span>
          </div>
          <h3 style="font-size: 1.25rem;">#${complaint.id}: ${this.escapeHtml(complaint.title)}</h3>
          <p class="text-xs text-muted" style="margin-top: 4px;">Registered on ${this.formatDateTime(complaint.createdAt)} by ${complaint.studentName} (${complaint.studentEmail})</p>
        </div>

        <div class="form-row" style="margin-bottom: 16px; background-color: var(--neutral-50); padding: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--neutral-200);">
          <div>
            <div class="text-xs text-muted font-semibold">CATEGORY</div>
            <div class="font-semibold text-sm">${complaint.category}</div>
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">LOCATION</div>
            <div class="font-semibold text-sm">${this.escapeHtml(complaint.location)}</div>
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">ASSIGNED TO</div>
            <div class="font-semibold text-sm">${complaint.assignedStaffName || 'Unassigned'}</div>
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">LAST UPDATED</div>
            <div class="font-semibold text-sm">${this.formatDateTime(complaint.updatedAt)}</div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div class="text-xs text-muted font-semibold" style="margin-bottom: 4px;">DESCRIPTION</div>
          <div style="font-size: 0.9375rem; color: var(--neutral-800); line-height: 1.5;">${this.escapeHtml(complaint.description)}</div>
        </div>

        ${complaint.imageUrl ? `
          <div style="margin-bottom: 20px;">
            <div class="text-xs text-muted font-semibold" style="margin-bottom: 6px;">ATTACHED EVIDENCE PHOTO</div>
            <img src="${complaint.imageUrl}" alt="Evidence" style="max-height: 220px; border-radius: var(--border-radius-md); border: 1px solid var(--neutral-200);">
          </div>
        ` : ''}

        <div style="margin-top: 24px;">
          <h4 style="font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--neutral-200); padding-bottom: 6px;">
            History Timeline
          </h4>
          <div class="timeline">
            ${this.buildTimelineHtml(complaint)}
          </div>
        </div>
      `;

      this.openModal('modalComplaintDetails');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ===========================================================================
  // API Configuration Modal (Phase 6 Integration)
  // ===========================================================================
  openApiConfigModal() {
    const input = document.getElementById('apiConfigUrlInput');
    if (input) input.value = CampusAPI.config.BASE_URL;
    this.openModal('modalApiConfig');
  },

  async handleSaveApiConfig(e) {
    e.preventDefault();
    const newUrl = document.getElementById('apiConfigUrlInput').value.trim();
    if (!newUrl) {
      this.showToast('Please enter a valid base URL.', 'error');
      return;
    }

    CampusAPI.config.setBaseUrl(newUrl);
    this.showToast(`API Base URL updated to: ${newUrl}`, 'info');

    // Test ping
    try {
      const res = await fetch(`${newUrl}/complaints`, { method: 'GET' }).catch(() => null);
      if (res && res.ok) {
        this.showToast('Connected to Flask Backend successfully!', 'success');
      } else {
        this.showToast('Backend not responding yet. Operating in local mock data fallback mode.', 'info');
      }
    } catch (e) {
      this.showToast('Backend offline. Mock mode active.', 'info');
    }

    this.closeModal('modalApiConfig');
  },

  // ===========================================================================
  // Generic Modal Helpers
  // ===========================================================================
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
  },

  // ===========================================================================
  // Table Rendering Helpers
  // ===========================================================================
  renderTableRows(tbodyId, complaints, isCompact = false) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (complaints.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="7">No complaints found.</td>
        </tr>`;
      return;
    }

    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td>
          <a href="javascript:void(0)" class="complaint-id-link" onclick="App.navigateTo('track-complaint', { id: '${c.id}' })">
            ${c.id}
          </a>
        </td>
        <td class="complaint-title-cell" title="${this.escapeHtml(c.title)}">
          ${this.escapeHtml(c.title)}
        </td>
        <td><span class="badge badge-category">${c.category}</span></td>
        <td class="text-xs text-muted">${this.formatDate(c.createdAt)}</td>
        <td><span class="badge ${this.getPriorityBadgeClass(c.priority)}">${c.priority}</span></td>
        <td><span class="badge ${this.getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('track-complaint', { id: '${c.id}' })">
            Track
          </button>
        </td>
      </tr>
    `).join('');
  },

  // ===========================================================================
  // Utility & Formatting Helpers
  // ===========================================================================
  getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
      case 'new': return 'badge-status-new';
      case 'pending': return 'badge-status-pending';
      case 'in progress': return 'badge-status-progress';
      case 'resolved': return 'badge-status-resolved';
      case 'rejected': return 'badge-status-rejected';
      default: return 'badge-status-pending';
    }
  },

  getPriorityBadgeClass(priority) {
    switch (priority.toLowerCase()) {
      case 'low': return 'badge-priority-low';
      case 'medium': return 'badge-priority-medium';
      case 'high': return 'badge-priority-high';
      case 'urgent': return 'badge-priority-urgent';
      default: return 'badge-priority-medium';
    }
  },

  formatDate(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add('is-invalid');
    let feedback = input.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      input.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
  },

  clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.remove('is-invalid');
    const feedback = input.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = '';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div style="flex: 1;">${this.escapeHtml(message)}</div>
      <button style="background: none; border: none; color: white; cursor: pointer; font-size: 1.1rem; padding: 0 4px;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }
};

// Make accessible to global window
window.App = App;
