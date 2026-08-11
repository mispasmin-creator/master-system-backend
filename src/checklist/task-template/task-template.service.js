// Helper functions for date manipulation
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
  const [targetDay, targetMonth, targetYear] = targetDateStr.split('/').map(Number);
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay);

  let closestIndex = -1;
  let minDifference = Infinity;

  for (let i = 0; i < workingDays.length; i++) {
    const [workingDay, workingMonth, workingYear] = workingDays[i].split('/').map(Number);
    const currentDate = new Date(workingYear, workingMonth - 1, workingDay);

    const difference = Math.abs((currentDate - targetDate) / (1000 * 60 * 60 * 24));

    if (currentDate >= targetDate && difference < minDifference) {
      minDifference = difference;
      closestIndex = i;
    }
  }

  return closestIndex;
};

const findEndOfWeekDate = (date, weekNumber, workingDays) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = workingDays.filter(dateStr => {
    const [, m, y] = dateStr.split('/').map(Number);
    return y === year && m === month + 1;
  });

  daysInMonth.sort((a, b) => {
    const [dayA] = a.split('/').map(Number);
    const [dayB] = b.split('/').map(Number);
    return dayA - dayB;
  });

  const weekGroups = [];
  let currentWeek = [];
  let lastWeekDay = -1;

  for (const dateStr of daysInMonth) {
    const [workingDay2, m, y] = dateStr.split('/').map(Number);
    const dateObj = new Date(y, m - 1, workingDay2);
    const weekDay = dateObj.getDay();

    if (weekDay <= lastWeekDay || currentWeek.length === 0) {
      if (currentWeek.length > 0) {
        weekGroups.push(currentWeek);
      }
      currentWeek = [dateStr];
    } else {
      currentWeek.push(dateStr);
    }

    lastWeekDay = weekDay;
  }

  if (currentWeek.length > 0) {
    weekGroups.push(currentWeek);
  }

  if (weekNumber === -1) {
    return weekGroups[weekGroups.length - 1]?.[weekGroups[weekGroups.length - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
  } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
    return weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
  } else {
    return daysInMonth[daysInMonth.length - 1];
  }
};

/**
 * Generate task occurrences based on frequency and working days
 * @param {Object} params
 * @param {string} params.frequency - frequency (daily, weekly, monthly, etc)
 * @param {Date|string} params.startDate - the start date
 * @param {string[]} params.workingDaysConfig - Array of working dates in 'DD/MM/YYYY' format
 * @param {Date|string} params.endDate - Optional end date (defaults to 1 year from start if missing)
 * @returns {Array<{ dueDate: Date }>} - Array of generated dates
 */
const generateTaskOccurrences = ({ frequency, startDate, workingDaysConfig, endDate }) => {
  if (!startDate || !workingDaysConfig || !Array.isArray(workingDaysConfig) || workingDaysConfig.length === 0) {
    return [];
  }

  const selectedDate = new Date(startDate);
  // Default end date to 1 year if not provided, to prevent infinite loops
  const limitDate = endDate ? new Date(endDate) : addYears(selectedDate, 1);

  // Sort working days to ensure chronological order
  const sortedWorkingDays = [...workingDaysConfig].sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
  });

  const futureDates = sortedWorkingDays.filter(dateStr => {
    const [dateDay, month, year] = dateStr.split('/').map(Number);
    const dateObj = new Date(year, month - 1, dateDay);
    return dateObj >= selectedDate && dateObj <= limitDate;
  });

  if (futureDates.length === 0) {
    return [];
  }

  const startDateStr = formatDateToDDMMYYYY(selectedDate);
  let startIndex = futureDates.findIndex(d => d === startDateStr);

  if (startIndex === -1) {
    startIndex = 0;
  }

  const occurrences = [];
  
  if (frequency === "one-time") {
    const taskDateStr = futureDates[startIndex];
    if (taskDateStr) {
      const [d, m, y] = taskDateStr.split('/').map(Number);
      occurrences.push({ dueDate: new Date(y, m - 1, d) });
    }
    return occurrences;
  }

  let currentIndex = startIndex;

  while (currentIndex < futureDates.length) {
    const taskDateStr = futureDates[currentIndex];
    const [d, m, y] = taskDateStr.split('/').map(Number);
    
    occurrences.push({ dueDate: new Date(y, m - 1, d) });

    switch (frequency) {
      case "daily": {
        currentIndex += 1;
        break;
      }
      case "weekly": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addDays(currentDate, 7);
        const targetDateStr = formatDateToDDMMYYYY(targetDate);

        const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
          currentIndex = futureDates.length;
        }
        break;
      }
      case "fortnightly": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addDays(currentDate, 14);
        const targetDateStr = formatDateToDDMMYYYY(targetDate);

        const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
          currentIndex = futureDates.length;
        }
        break;
      }
      case "monthly": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addMonths(currentDate, 1);
        const targetDateStr = formatDateToDDMMYYYY(targetDate);

        const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
          currentIndex = futureDates.length;
        }
        break;
      }
      case "quarterly": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addMonths(currentDate, 3);
        const targetDateStr = formatDateToDDMMYYYY(targetDate);

        const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
          currentIndex = futureDates.length;
        }
        break;
      }
      case "yearly": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addYears(currentDate, 1);
        const targetDateStr = formatDateToDDMMYYYY(targetDate);

        const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
          currentIndex = futureDates.length;
        }
        break;
      }
      case "end-of-1st-week":
      case "end-of-2nd-week":
      case "end-of-3rd-week":
      case "end-of-4th-week":
      case "end-of-last-week": {
        const currentDate = new Date(y, m - 1, d);
        const targetDate = addMonths(currentDate, 1);

        let weekNumber;
        switch (frequency) {
          case "end-of-1st-week": weekNumber = 1; break;
          case "end-of-2nd-week": weekNumber = 2; break;
          case "end-of-3rd-week": weekNumber = 3; break;
          case "end-of-4th-week": weekNumber = 4; break;
          case "end-of-last-week": weekNumber = -1; break;
        }

        const targetDateStr = findEndOfWeekDate(targetDate, weekNumber, futureDates);
        const nextIndex = futureDates.indexOf(targetDateStr);
        
        // Ensure we strictly advance
        if (nextIndex !== -1 && nextIndex > currentIndex) {
          currentIndex = nextIndex;
        } else {
           // If we can't find a valid next date that's strictly greater, break loop
           currentIndex = futureDates.length;
        }
        break;
      }
      default: {
        currentIndex = futureDates.length;
      }
    }
  }

  return occurrences;
};

module.exports = {
  generateTaskOccurrences,
};
