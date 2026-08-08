// Local Storage Keys
const STORAGE_TASKS_KEY = "scheduler_tasks_list";
const STORAGE_COMPLETED_KEY = "scheduler_completed_keys";

// Viewing State
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let selectedColor = "#f97316";

// Selected Date for Filter (null = default "Today & Overdue")
let selectedDate = null;

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_TASKS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse tasks", e);
    }
  }
  return [];
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
let completedKeys = loadCompletedKeys();

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function isTaskDueOnDate(task, dateObj) {
  if (!task.startDate) return false;

  const targetKey = formatDateKey(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );

  const interval = Number(task.intervalDays);

  if (interval === 0 || isNaN(interval)) {
    return task.startDate === targetKey;
  }

  const [startYear, startMonth, startDay] = task.startDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

  if (target < start) return false;

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays % interval === 0;
}

function getTasksForDate(dateObj) {
  return tasks.filter(task => isTaskDueOnDate(task, dateObj));
}

function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const titleEl = document.getElementById("calendar-title");

  if (!gridEl || !titleEl) return;

  gridEl.innerHTML = "";

  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  // Weekday Headers (Monday to Sunday)
  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  // Convert Sunday-first (0-6) to Monday-first (0-6)
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const padding = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Render Padding Tiles
  for (let i = 0; i < padding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }

  const today = new Date();

  // Render Day Tiles
  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dateKeyStr = formatDateKey(currentYear, currentMonth, day);
    const dueTasks = getTasksForDate(dayDate);

    const tile = document.createElement("div");
    tile.className = "day-tile clickable";

    // Highlight today
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
      tile.classList.add("is-today");
    }

    // Highlight selected date
    if (selectedDate && 
        selectedDate.getFullYear() === currentYear && 
        selectedDate.getMonth() === currentMonth && 
        selectedDate.getDate() === day) {
      tile.classList.add("is-selected");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

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

      indicator.innerHTML = dueTasks.map(task => {
        const isDone = completedKeys.has(`${task.id}_${dateKeyStr}`);
        const dotColor = isDone ? 'var(--accent-green)' : (task.color || 'var(--accent)');
        return `<span class="dot" style="background-color: ${dotColor};"></span>`;
      }).join('');
      
      tile.appendChild(indicator);
    }

    // Click Event Listener
    tile.addEventListener("click", () => {
      if (selectedDate && 
          selectedDate.getFullYear() === currentYear && 
          selectedDate.getMonth() === currentMonth && 
          selectedDate.getDate() === day) {
        selectedDate = null; // Unselect if clicked again
      } else {
        selectedDate = new Date(currentYear, currentMonth, day);
      }
      renderCalendar();
      renderUpcomingTasks();
    });

    gridEl.appendChild(tile);
  }

  // Trailing Padding
  const totalSlotsRendered = padding + totalDays;
  const trailingPadding = (42 - totalSlotsRendered) % 7;
  for (let i = 0; i < trailingPadding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }
}

function getIntervalLabel(days) {
  switch (Number(days)) {
    case 0: return "Once";
    case 1: return "Daily";
    case 7: return "Weekly";
    case 14: return "Bi-weekly";
    case 30: return "Monthly";
    case 60: return "Bi-monthly";
    case 90: return "Quarterly";
    default: return `Every ${days} days`;
  }
}

function selectColorOption(colorHex) {
  selectedColor = colorHex;
  const colorPicker = document.getElementById("color-picker");
  if (!colorPicker) return;

  const options = colorPicker.querySelectorAll(".color-option");
  let matched = false;

  options.forEach(el => {
    if (el.dataset.color.toLowerCase() === colorHex.toLowerCase()) {
      el.classList.add("selected");
      matched = true;
    } else {
      el.classList.remove("selected");
    }
  });

  if (!matched && options.length > 0) {
    options[0].classList.add("selected");
    selectedColor = options[0].dataset.color;
  }
}

function openEditModal(task) {
  const modalOverlay = document.getElementById("task-modal");
  const modalTitle = document.getElementById("modal-title");
  const editIdInput = document.getElementById("editing-task-id");
  const titleInput = document.getElementById("task-title-input");
  const intervalSelect = document.getElementById("task-interval-select");
  const startInput = document.getElementById("task-start-input");
  const deleteBtn = document.getElementById("delete-task-btn");

  if (modalTitle) modalTitle.textContent = "Edit Task";
  if (editIdInput) editIdInput.value = task.id;
  if (titleInput) titleInput.value = task.title;
  if (intervalSelect) intervalSelect.value = task.intervalDays;
  if (startInput) startInput.value = task.startDate;

  selectColorOption(task.color || "#f97316");

  if (deleteBtn) deleteBtn.style.display = "inline-block";
  if (modalOverlay) modalOverlay.classList.remove("hidden");
}

function renderUpcomingTasks() {
  const container = document.getElementById("upcoming-tasks-list");
  const headerLabel = document.getElementById("due-tasks-label");
  const resetBtn = document.getElementById("reset-filter-btn");

  if (!container) return;

  container.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let taskList = [];

  if (selectedDate) {
    // Mode A: Show tasks for selected calendar date
    const formattedHeader = selectedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    if (headerLabel) headerLabel.textContent = `Tasks for ${formattedHeader}`;
    if (resetBtn) resetBtn.classList.remove("hidden");

    const dateKeyStr = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const dueOnDate = getTasksForDate(selectedDate);

    dueOnDate.forEach(task => {
      const isCompleted = completedKeys.has(`${task.id}_${dateKeyStr}`);
      const isOverdue = selectedDate < today && !isCompleted;
      taskList.push({
        task,
        date: selectedDate,
        dateKeyStr,
        isCompleted,
        isOverdue
      });
    });

  } else {
    // Mode B: Default view (Overdue + Today)
    if (headerLabel) headerLabel.textContent = "Due Tasks";
    if (resetBtn) resetBtn.classList.add("hidden");

    let minDaysBack = 0;
    tasks.forEach(t => {
      if (t.startDate) {
        const [y, m, d] = t.startDate.split('-').map(Number);
        const sDate = new Date(y, m - 1, d);
        const diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
        if (diffDays > minDaysBack) minDaysBack = diffDays;
      }
    });

    // 1. Gather overdue tasks
    for (let i = minDaysBack; i > 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);

      const due = getTasksForDate(checkDate);
      const dateKeyStr = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      due.forEach(task => {
        const isCompleted = completedKeys.has(`${task.id}_${dateKeyStr}`);
        if (!isCompleted) {
          taskList.push({
            task,
            date: checkDate,
            dateKeyStr,
            isCompleted: false,
            isOverdue: true
          });
        }
      });
    }

    // 2. Gather tasks due today
    const todayDue = getTasksForDate(today);
    const todayKeyStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    todayDue.forEach(task => {
      taskList.push({
        task,
        date: today,
        dateKeyStr: todayKeyStr,
        isCompleted: completedKeys.has(`${task.id}_${todayKeyStr}`),
        isOverdue: false
      });
    });
  }

  if (taskList.length === 0) {
    const emptyMsg = selectedDate 
      ? `No tasks scheduled for ${selectedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}.` 
      : `No tasks scheduled for today or past due.`;
    container.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
    return;
  }

  taskList.forEach(item => {
    const card = document.createElement("div");
    card.className = `task-card ${item.isCompleted ? 'completed' : ''}`;
    
    const taskColor = item.task.color || 'var(--accent)';
    card.style.borderLeftColor = item.isCompleted ? 'var(--accent-green)' : taskColor;

    const dateFormatted = item.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
    const overdueTag = item.isOverdue ? ' · <strong style="color: #ef4444;">Overdue</strong>' : '';

    card.innerHTML = `
      <div class="task-info">
        <div class="task-title">${item.task.title}</div>
        <div class="task-sub">${dateFormatted} · ${getIntervalLabel(item.task.intervalDays)}${overdueTag}</div>
      </div>
      <div class="task-actions">
        <button class="edit-btn" title="Edit Task">✏️</button>
        <button class="check-btn">${item.isCompleted ? '✓' : ''}</button>
      </div>
    `;

    card.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(item.task);
    });

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

function deleteTask(id) {
  const taskToDelete = tasks.find(t => t.id === id);
  if (!taskToDelete) return;

  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);

  const newCompletedKeys = new Set();
  completedKeys.forEach(key => {
    if (!key.startsWith(`${id}_`)) {
      newCompletedKeys.add(key);
    }
  });
  completedKeys = newCompletedKeys;
  saveCompletedKeys(completedKeys);

  showToast("Task Deleted", taskToDelete.title);
}

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

document.addEventListener("DOMContentLoaded", () => {
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const openModalBtn = document.getElementById("open-modal-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalOverlay = document.getElementById("task-modal");
  const modalTitle = document.getElementById("modal-title");
  const editIdInput = document.getElementById("editing-task-id");
  const addBtn = document.getElementById("add-task-btn");
  const deleteBtn = document.getElementById("delete-task-btn");
  const colorPicker = document.getElementById("color-picker");
  const resetFilterBtn = document.getElementById("reset-filter-btn");

  const startDateInput = document.getElementById("task-start-input");
  if (startDateInput) {
    startDateInput.value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (colorPicker) {
    colorPicker.addEventListener("click", (e) => {
      const option = e.target.closest(".color-option");
      if (!option) return;

      colorPicker.querySelectorAll(".color-option").forEach(el => el.classList.remove("selected"));
      option.classList.add("selected");
      selectedColor = option.dataset.color;
    });
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", () => {
      selectedDate = null;
      renderCalendar();
      renderUpcomingTasks();
    });
  }

  function openNewTaskModal() {
    if (modalTitle) modalTitle.textContent = "New Task";
    if (editIdInput) editIdInput.value = "";

    const titleInput = document.getElementById("task-title-input");
    if (titleInput) titleInput.value = "";

    const startInput = document.getElementById("task-start-input");
    if (startInput) {
      const defaultDate = selectedDate || now;
      startInput.value = formatDateKey(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate());
    }

    const intervalSelect = document.getElementById("task-interval-select");
    if (intervalSelect) intervalSelect.value = "0";

    selectColorOption("#f97316");

    if (deleteBtn) deleteBtn.style.display = "none";
    if (modalOverlay) modalOverlay.classList.remove("hidden");
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.add("hidden");
  }

  if (openModalBtn) openModalBtn.addEventListener("click", openNewTaskModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const editId = editIdInput ? editIdInput.value : "";
      if (editId) {
        deleteTask(editId);
        closeModal();
        renderUpcomingTasks();
        renderCalendar();
      }
    });
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
      const intervalSelect = document.getElementById("task-interval-select");
      const startInput = document.getElementById("task-start-input");
      const editId = editIdInput ? editIdInput.value : "";

      const title = titleInput ? titleInput.value.trim() : "";
      const interval = intervalSelect ? parseInt(intervalSelect.value, 10) : 0;
      const start = startInput ? startInput.value : "";

      if (!title || isNaN(interval) || !start) {
        showToast("Error", "Please fill out all fields.");
        return;
      }

      if (editId) {
        const taskIdx = tasks.findIndex(t => t.id === editId);
        if (taskIdx !== -1) {
          tasks[taskIdx] = {
            ...tasks[taskIdx],
            title,
            intervalDays: interval,
            startDate: start,
            color: selectedColor
          };
          saveTasks(tasks);
          showToast("Task Updated", title);
        }
      } else {
        const newTask = {
          id: Date.now().toString(),
          title,
          intervalDays: interval,
          startDate: start,
          color: selectedColor
        };
        tasks.push(newTask);
        saveTasks(tasks);
        showToast("Added Task", title);
      }

      if (titleInput) titleInput.value = "";
      closeModal();

      renderUpcomingTasks();
      renderCalendar();
    });
  }

  renderCalendar();
  renderUpcomingTasks();
});