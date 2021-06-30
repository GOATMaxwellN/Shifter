"use strict";

function drawCalendar() {
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
    for (let i = 1; i <= daysInMonth; i++) {
        html += `<div class="calendar-date">${i}</div>`;
    }
    calendar.innerHTML = html;
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
    drawCalendar();
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
    drawCalendar();
}


function getDaysInMonth() {
    return new Date(
        displayedYearAndMonth.getFullYear(), 
        displayedYearAndMonth.getMonth() + 1, 0).getDate();
}

const MONTHS = ["January", "February", ""]
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
