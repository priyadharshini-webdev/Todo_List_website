// get the page name from <body data-page="...">
const page = document.body.dataset.page;

// get saved tasks from the browser, or start with an empty list
let tasks = JSON.parse(localStorage.getItem("tickit.tasks")) || [];

// save the tasks in the browser
function saveTasks() {
  localStorage.setItem("tickit.tasks", JSON.stringify(tasks));
}

// ---------- navbar ----------

// show the menu at the top (same menu on every page)
function showNavbar() {
  const labels = ["Home", "Pending", "Completed", "Profile"];
  let menu = "";

  for (let i = 0; i < labels.length; i++) {
    const name = labels[i].toLowerCase();         // "Home" -> "home"
    let active = "";
    if (name === page) {
      active = "active";                          // highlight the current page
    }
    menu += `<li class="nav-item"><a class="nav-link ${active}" href="${name}.html">${labels[i]}</a></li>`;
  }

  // put the navbar inside <div id="nav">
  document.getElementById("nav").innerHTML = `
    <nav class="navbar navbar-expand-sm sticky-top">
      <div class="container">
        <a class="navbar-brand brand" href="index.html">Tickit</a>
        <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse justify-content-end" id="menu">
          <ul class="navbar-nav gap-1">${menu}</ul>
        </div>
      </div>
    </nav>`;
}

// ---------- task list ----------

// choose which tasks this page should show
function getTasksForPage() {
  if (page === "pending") {
    return tasks.filter(task => task.done === false);
  }
  if (page === "completed") {
    return tasks.filter(task => task.done === true);
  }
  return tasks;                                   // home shows all tasks
}

// make one task row (checkbox + text + delete button)
function createTaskRow(task) {
  const row = document.createElement("div");
  row.className = "task soft-card";
  if (task.done) {
    row.classList.add("done");                    // done tasks get a line through
  }
  row.dataset.id = task.id;                       // remember which task this row is

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "form-check-input";
  checkbox.checked = task.done;

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;                   // textContent is safe for user text

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm btn-outline-sage delete-btn";
  deleteBtn.textContent = "✕";

  row.append(checkbox, text, deleteBtn);
  return row;
}

// show the tasks on the page
function showTasks() {
  const list = document.getElementById("task-list");
  if (list === null) return;                      // profile page has no task list

  const visibleTasks = getTasksForPage();
  list.innerHTML = "";                            // clear the old list

  // message when there are no tasks
  if (visibleTasks.length === 0) {
    let message = "No tasks yet. Add your first one above.";
    if (page === "pending") message = "Nothing pending. You're all caught up!";
    if (page === "completed") message = "No completed tasks yet.";
    list.innerHTML = `<div class="soft-card empty text-secondary">${message}</div>`;
    return;
  }

  // add one row for each task
  for (let i = 0; i < visibleTasks.length; i++) {
    list.appendChild(createTaskRow(visibleTasks[i]));
  }
}

// ---------- streak ----------

// change a time into text like "2026-10-17" so days are easy to compare
function getDateText(time) {
  return new Date(time).toLocaleDateString("en-CA");
}

// count how many tasks were finished on each day, like { "2026-10-17": 3 }
function getDoneCounts() {
  const counts = {};
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].done && tasks[i].doneAt) {
      const day = getDateText(tasks[i].doneAt);
      counts[day] = (counts[day] || 0) + 1;
    }
  }
  return counts;
}

// current streak = days in a row, counting back from today
function getCurrentStreak(counts) {
  let streak = 0;
  const day = new Date();

  // nothing done today yet? start from yesterday (streak is still alive)
  if (counts[getDateText(day)] === undefined) {
    day.setDate(day.getDate() - 1);
  }

  // keep going back while each day has a finished task
  while (counts[getDateText(day)] !== undefined) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

// best streak = longest days in a row ever
function getBestStreak(counts) {
  const days = Object.keys(counts).sort();        // all active days in order
  let best = 0;
  let run = 0;
  let previousDay = null;

  for (let i = 0; i < days.length; i++) {
    if (previousDay !== null) {
      const gap = (new Date(days[i]) - new Date(previousDay)) / 86400000;  // days between
      if (gap === 1) {
        run++;                                    // next day, streak continues
      } else {
        run = 1;                                  // gap found, start again
      }
    } else {
      run = 1;
    }
    if (run > best) best = run;
    previousDay = days[i];
  }
  return best;
}

// ---------- numbers on the home page ----------

function showHomeNumbers() {
  const doneCount = tasks.filter(task => task.done).length;
  const pendingCount = tasks.length - doneCount;

  // percentage of tasks completed
  let percent = 0;
  if (tasks.length > 0) {
    percent = Math.round((doneCount / tasks.length) * 100);
  }

  // text under "My Tasks"
  const summary = document.getElementById("summary");
  if (summary !== null) {
    summary.textContent = pendingCount + " pending, " + doneCount + " completed";
  }

  // progress card on the right side (only on home page)
  if (document.getElementById("percent") !== null) {
    document.getElementById("percent").textContent = percent + "%";
    document.getElementById("bar").style.width = percent + "%";
    document.getElementById("pending-count").textContent = pendingCount;
    document.getElementById("done-count").textContent = doneCount;
    document.getElementById("streak-side").textContent = getCurrentStreak(getDoneCounts());
  }
}

// ---------- profile page ----------

function showProfile() {
  const calendar = document.getElementById("calendar");
  if (calendar === null) return;                  // only the profile page has a calendar

  const counts = getDoneCounts();
  const current = getCurrentStreak(counts);

  document.getElementById("streak-current").textContent = current;
  document.getElementById("streak-best").textContent = getBestStreak(counts);
  document.getElementById("total-done").textContent = tasks.filter(task => task.done).length;

  // message under "My Profile"
  if (current > 0) {
    document.getElementById("streak-msg").textContent = current + "-day streak. Keep it going!";
  } else {
    document.getElementById("streak-msg").textContent = "Complete a task today to start your streak.";
  }

  // make 28 small boxes, from 27 days ago up to today
  calendar.innerHTML = "";
  for (let i = 27; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const box = document.createElement("div");
    box.className = "cell";
    if (counts[getDateText(date)] !== undefined) {
      box.classList.add("on");                    // green box = task finished that day
    }
    if (i === 0) {
      box.classList.add("today");                 // outline for today
    }
    box.textContent = date.getDate();             // day number
    calendar.appendChild(box);
  }
}

// ---------- show everything ----------

function showAll() {
  showTasks();
  showHomeNumbers();
  showProfile();
}

// ---------- buttons and clicks ----------

// add a new task (home page)
const addForm = document.getElementById("add-form");
if (addForm !== null) {
  addForm.addEventListener("submit", function (event) {
    event.preventDefault();                       // stop the page from reloading
    const input = document.getElementById("task-input");
    const text = input.value.trim();              // remove extra spaces

    // empty text: show red outline
    if (text === "") {
      input.classList.add("is-invalid");
      input.placeholder = "Type a task first...";
      return;
    }

    input.classList.remove("is-invalid");
    tasks.unshift({ id: Date.now(), text: text, done: false, doneAt: null });  // add at the top
    input.value = "";
    saveTasks();
    showAll();
  });
}

// tick or delete a task
const taskList = document.getElementById("task-list");
if (taskList !== null) {

  // when a checkbox is clicked
  taskList.addEventListener("change", function (event) {
    const row = event.target.closest(".task");
    if (row === null) return;

    const id = Number(row.dataset.id);
    const task = tasks.find(t => t.id === id);    // find the clicked task
    task.done = event.target.checked;

    if (task.done) {
      task.doneAt = Date.now();                   // save the time (used for streak)
    } else {
      task.doneAt = null;
    }
    saveTasks();
    showAll();
  });

  // when the delete button is clicked
  taskList.addEventListener("click", function (event) {
    if (event.target.closest(".delete-btn") === null) return;

    const id = Number(event.target.closest(".task").dataset.id);
    tasks = tasks.filter(t => t.id !== id);       // keep every task except this one
    saveTasks();
    showAll();
  });
}

// clear all completed tasks (completed page)
const clearBtn = document.getElementById("clear-btn");
if (clearBtn !== null) {
  clearBtn.addEventListener("click", function () {
    tasks = tasks.filter(t => t.done === false);  // keep only pending tasks
    saveTasks();
    showAll();
  });
}

// ---------- start ----------
showNavbar();
showAll();