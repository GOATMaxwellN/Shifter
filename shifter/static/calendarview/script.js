"use strict";


function drawCalendar(events) {
    let daysInMonth = getDaysInMonth();
    let firstWeekday = displayedYearAndMonth.getDay();
    let monthName = displayedYearAndMonth.toLocaleDateString("en-US", {month: 'long'})
    let calendar = document.getElementsByClassName("calendar")[0];
    let html = `
        <div class="calendar-month">${monthName}</div>
        <div class="calendar-names-of-days">${NAMES_OF_DAYS}</div>`;
    if (firstWeekday !== 0) {
        for (let i = 0; i < firstWeekday; i++) {
            html += "<div class='no-date'></div>";
        }
    }
    // Draw each date box
    for (let i = 1; i <= daysInMonth; i++) {
        html += `<div id="day${i}" class="calendar-date">${i}</div>`;
    }
    calendar.innerHTML = html;
    // Populate the date boxes with events in them
    events.forEach(function(v, i, a) {
        let start = new Date(v["start"]["dateTime"]);
        let dateBox = document.getElementById("day" + start.getDate());
        dateBox.innerHTML += `<div class="event">${v.summary}</div>`
    });
}

function nextMonth() {
    let month = displayedYearAndMonth.getMonth();
    let year = displayedYearAndMonth.getFullYear();
    if (month !== 11) {
        ++month;
        displayedYearAndMonth.setMonth(month);
    } else {
        month = 0;
        ++year;
        displayedYearAndMonth.setFullYear(year, month);
    }

    let min = startOfMonth(), max = endOfMonth();
    googleListEvents(min, max);
}

function previousMonth() {
    let month = displayedYearAndMonth.getMonth();
    let year = displayedYearAndMonth.getFullYear();
    if (month !== 0) {
        --month;
        displayedYearAndMonth.setMonth(month);
    } else {
        month = 11;
        --year;
        displayedYearAndMonth.setFullYear(year, month);
    }

    let min = startOfMonth(), max = endOfMonth();
    googleListEvents(min, max);
}

function startOfMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(),
        displayedYearAndMonth.getMonth(),
        1, 
        0, 0, 0
    ).toISOString();
}


function endOfMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(),
        displayedYearAndMonth.getMonth(),
        getDaysInMonth(),
        23, 59, 59
    ).toISOString();
}


function getDaysInMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(), 
        displayedYearAndMonth.getMonth() + 1, 0
    ).getDate();
}


function connectToGoogle() {
    window.location.href = "http://127.0.0.1:5000/oauth/connect-to-google";
}


function googleListEvents(min, max) {
    let req = new XMLHttpRequest();
    req.responseType = "json";
    req.onload = function() {
        let events = this.response;
        drawCalendar(events);
    }
    let url = GOOGLE_LIST_EVENTS_ENDPOINT
              + `?timeMin=${min}&timeMax=${max}&timezone=${TIMEZONE}`;
    req.open("GET", url);
    req.send();
}


const GOOGLE_LIST_EVENTS_ENDPOINT = "http://127.0.0.1:5000/oauth/google-list-events";
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const NAMES_OF_DAYS = `
    <span>Sunday</span>
    <span>Monday</span>
    <span>Tuesday</span>
    <span>Wednesday</span>
    <span>Thursday</span>
    <span>Friday</span>
    <span>Saturday</span>
`;

let displayedYearAndMonth = new Date();
displayedYearAndMonth.setDate(1);
