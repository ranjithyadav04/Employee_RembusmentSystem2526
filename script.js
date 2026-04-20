document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginForm = document.getElementById('loginForm');
    const claimForm = document.getElementById('claimForm');
    
    // Sections
    const loginSection = document.getElementById('loginSection');
    const empDashboard = document.getElementById('employeeDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    const mainNav = document.getElementById('mainNav');
    const userGreeting = document.getElementById('userGreeting');

    // --- 1. LOGIN LOGIC ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            const data = await response.json();

            if (data.success) {
                // Save user session to browser memory
                localStorage.setItem('user', JSON.stringify(data.user));
                renderDashboard(data.user);
            } else {
                alert("Login Failed: " + data.message);
            }
        } catch (error) {
            console.error("Connection Error:", error);
            alert("Could not connect to the server. Make sure Node.js is running.");
        }
    });

    // --- 2. RENDER DASHBOARD (Logic to Switch Views) ---
    function renderDashboard(user) {
        loginSection.classList.remove('active');
        mainNav.classList.remove('hidden');
        userGreeting.innerText = `Logged in as: ${user.full_name}`;

        if (user.role === 'employee') {
            empDashboard.classList.add('active');
            adminDashboard.classList.remove('active');
            loadEmployeeRequests(user.id);
        } else {
            adminDashboard.classList.add('active');
            empDashboard.classList.remove('active');
            loadAdminRequests();
        }
    }

    // --- 3. EMPLOYEE: LOAD DATA ---
    async function loadEmployeeRequests(userId) {
        const res = await fetch(`http://localhost:5000/api/requests/employee/${userId}`);
        const requests = await res.json();
        
        const tableBody = empDashboard.querySelector('tbody');
        tableBody.innerHTML = ''; 

        requests.forEach(req => {
            const row = `
                <tr>
                    <td>${new Date(req.created_at).toLocaleDateString()}</td>
                    <td>${req.title}</td>
                    <td>$${req.amount}</td>
                    <td><span class="badge ${req.status}">${req.status}</span></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // --- 4. EMPLOYEE: SUBMIT NEW CLAIM ---
    // Use the "Submit Request" button logic
    const submitBtn = claimForm.querySelector('button');
    submitBtn.addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        const title = claimForm.querySelector('input[type="text"]').value;
        const amount = claimForm.querySelector('input[type="number"]').value;
        const description = claimForm.querySelector('textarea').value;

        if(!title || !amount) return alert("Please fill Title and Amount");

        const response = await fetch('http://localhost:5000/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: user.id, 
                title, 
                amount, 
                description 
            })
        });

        const result = await response.json();
        if(result.success) {
            alert("Claim Submitted!");
            claimForm.reset();
            loadEmployeeRequests(user.id); // Refresh table
        }
    });

    // --- 5. ADMIN: LOAD ALL PENDING DATA ---
    async function loadAdminRequests() {
        const res = await fetch('http://localhost:5000/api/requests/admin');
        const requests = await res.json();
        
        const tableBody = adminDashboard.querySelector('tbody');
        tableBody.innerHTML = '';

        requests.forEach(req => {
            const row = `
                <tr>
                    <td><b>${req.full_name}</b></td>
                    <td>${new Date(req.created_at).toLocaleDateString()}</td>
                    <td>${req.description}</td>
                    <td>$${req.amount}</td>
                    <td><a href="#" class="view-link">View Bill</a></td>
                    <td>
                        <button class="btn btn-approve" onclick="updateStatus(${req.id}, 'approved')">Approve</button>
                        <button class="btn btn-reject" onclick="updateStatus(${req.id}, 'rejected')">Reject</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // Check for existing session on page load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        renderDashboard(JSON.parse(savedUser));
    }
});

// --- 6. GLOBAL ACTION FOR ADMIN (Approve/Reject) ---
async function updateStatus(requestId, newStatus) {
    try {
        const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            alert(`Request ${newStatus.toUpperCase()}`);
            location.reload(); // Quick refresh to update Admin view
        }
    } catch (err) {
        console.error("Update failed", err);
    }
}

// LOGOUT
function logout() {
    localStorage.removeItem('user');
    window.location.reload();
}