// Local Storage Keys
const STORAGE_TASKS_KEY = "scheduler_tasks_list";
const STORAGE_COMPLETED_KEY = "scheduler_completed_keys";

// Viewing State
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

// Load or initialize default recurring tasks
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_TASKS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse tasks", e);
    }
  }
  // Default sample tasks if empty
  return [
    { id: "1", title: "Water Plants", intervalDays: 3, startDate: formatDateKey(now.getFullYear(), now.getMonth(), 1) },
    { id: "2", title: "Backup Database", intervalDays: 7, startDate: formatDateKey(now.getFullYear(), now.getMonth(), 3) },
    { id: "3", title: "Monthly Review", intervalDays: 30, startDate: formatDateKey(now.getFullYear(), now.getMonth(), 5) }
  ];
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

function loadCompletedKeys() {
  const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse completion records", e);
    }
  }
  return new Set();
}

function saveCompletedKeys(completedSet) {
  localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(Array.from(completedSet)));
}

let tasks = loadTasks();
let completedKeys = loadCompletedKeys(); // Format: `${taskId}_${YYYY-MM-DD}`

// Helper: Format YYYY-MM-DD
function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Calculate whether a task falls on a given date based on start date and interval
function isTaskDueOnDate(task, dateObj) {
  const startParts = task.startDate.split('-').map(Number);
  const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

  // Reset time portions for accurate date difference calculation
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (target < start) return false;

  const diffTime = Math.abs(target - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays % task.intervalDays === 0;
}

// Get all tasks due on a specific date
function getTasksForDate(dateObj) {
  return tasks.filter(task => isTaskDueOnDate(task, dateObj));
}

// Render Calendar Grid
function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const titleEl = document.getElementById("calendar-title");
  const prevBtn = document.getElementById("prev-month");

  if (!gridEl || !titleEl) return;

  gridEl.innerHTML = "";

  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const padding = (firstDayIndex + 6) % 7; 

  // Padding days before start of month
  for (let i = 0; i < padding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }

  const today = new Date();

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dateKeyStr = formatDateKey(currentYear, currentMonth, day);
    const dueTasks = getTasksForDate(dayDate);

    const tile = document.createElement("div");
    tile.className = "day-tile";

    if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
      tile.classList.add("is-today");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

    // Indicator for tasks
    if (dueTasks.length > 0) {
      tile.classList.add("has-task");
      const indicator = document.createElement("div");
      indicator.className = "task-dots";

      let allDone = true;
      dueTasks.forEach(task => {
        const key = `${task.id}_${dateKeyStr}`;
        if (!completedKeys.has(key)) allDone = false;
      });

      if (allDone) {
        tile.classList.add("all-completed");
      }

      indicator.innerHTML = dueTasks.map(() => `<span class="dot"></span>`).join('');
      tile.appendChild(indicator);
    }

    gridEl.appendChild(tile);
  }

  // Ensure fixed 6-week grid padding
  const totalSlotsRendered = padding + totalDays;
  const trailingPadding = 42 - totalSlotsRendered;
  for (let i = 0; i < trailingPadding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }
}

// Render Upcoming Tasks for Current Week
function renderUpcomingTasks() {
  const container = document.getElementById("upcoming-tasks-list");
  if (!container) return;

  container.innerHTML = "";

  const today = new Date();
  const dayOfWeek = today.getDay();
  // Compute Start of Week (Monday)
  const mondayOffset = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - mondayOffset);

  let weekTasks = [];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(startOfWeek);
    checkDate.setDate(startOfWeek.getDate() + i);

    const due = getTasksForDate(checkDate);
    const dateKeyStr = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

    due.forEach(task => {
      weekTasks.push({
        task,
        date: checkDate,
        dateKeyStr,
        isCompleted: completedKeys.has(`${task.id}_${dateKeyStr}`)
      });
    });
  }

  if (weekTasks.length === 0) {
    container.innerHTML = `<div class="empty-state">No tasks scheduled for this week.</div>`;
    return;
  }

  weekTasks.forEach(item => {
    const card = document.createElement("div");
    card.className = `task-card ${item.isCompleted ? 'completed' : ''}`;

    const dateFormatted = item.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });

    card.innerHTML = `
      <div class="task-info">
        <div class="task-title">${item.task.title}</div>
        <div class="task-sub">${dateFormatted} · Every ${item.task.intervalDays} days</div>
      </div>
      <button class="check-btn">${item.isCompleted ? '✓' : ''}</button>
    `;

    card.querySelector(".check-btn").addEventListener("click", () => {
      const completionKey = `${item.task.id}_${item.dateKeyStr}`;
      if (completedKeys.has(completionKey)) {
        completedKeys.delete(completionKey);
      } else {
        completedKeys.add(completionKey);
        showToast("Task Done!", item.task.title);
      }
      saveCompletedKeys(completedKeys);
      renderUpcomingTasks();
      renderCalendar();
    });

    container.appendChild(card);
  });
}

// Toast System
let toastTimeout;
function showToast(title, sub) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  document.getElementById("toast-title").textContent = title;
  document.getElementById("toast-sub").textContent = sub;

  toast.classList.remove("hidden");
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2000);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const addBtn = document.getElementById("add-task-btn");

  // Set default start date input to today
  const startDateInput = document.getElementById("task-start-input");
  if (startDateInput) {
    startDateInput.value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
      } else {
        currentMonth--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      renderCalendar();
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const titleInput = document.getElementById("task-title-input");
      const intervalInput = document.getElementById("task-interval-input");
      const startInput = document.getElementById("task-start-input");

      const title = titleInput.value.trim();
      const interval = parseInt(intervalInput.value, 10);
      const start = startInput.value;

      if (!title || isNaN(interval) || interval < 1 || !start) {
        showToast("Error", "Please fill out all fields.");
        return;
      }

      const newTask = {
        id: Date.now().toString(),
        title,
        intervalDays: interval,
        startDate: start
      };

      tasks.push(newTask);
      saveTasks(tasks);

      titleInput.value = "";
      showToast("Added Task", title);

      renderUpcomingTasks();
      renderCalendar();
    });
  }

  renderCalendar();
  renderUpcomingTasks();
});