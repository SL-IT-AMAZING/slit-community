/**
 * LLM 유틸리티
 * GitHub 분석은 Claude Code가 직접 처리
 */

/**
 * 상대 시간 문자열을 ISO 시간으로 변환
 * @param {string} relativeTime - "2h", "1d", "Jan 14" 등
 * @returns {string} ISO 8601 형식 시간
 */
export function parseRelativeTime(relativeTime) {
  if (!relativeTime) return new Date().toISOString();

  const now = new Date();
  const str = relativeTime.toString().toLowerCase().trim();

  if (str === "just now" || str === "now" || str === "방금") {
    return now.toISOString();
  }

  const timeMatch = str.match(
    /^(\d+)\s*(s|sec|m|min|h|hr|d|w|mo|y)(?:s|ours?|inutes?|ays?|eeks?|onths?|ears?)?$/i,
  );
  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();

    switch (unit) {
      case "s":
      case "sec":
        now.setSeconds(now.getSeconds() - value);
        break;
      case "m":
      case "min":
        now.setMinutes(now.getMinutes() - value);
        break;
      case "h":
      case "hr":
        now.setHours(now.getHours() - value);
        break;
      case "d":
        now.setDate(now.getDate() - value);
        break;
      case "w":
        now.setDate(now.getDate() - value * 7);
        break;
      case "mo":
        now.setMonth(now.getMonth() - value);
        break;
      case "y":
        now.setFullYear(now.getFullYear() - value);
        break;
    }
    return now.toISOString();
  }

  const monthNames = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const monthDayMatch = str.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})$/i,
  );
  if (monthDayMatch) {
    const month = monthNames[monthDayMatch[1].toLowerCase().slice(0, 3)];
    const day = parseInt(monthDayMatch[2]);

    now.setMonth(month);
    now.setDate(day);
    now.setHours(12, 0, 0, 0);

    if (now > new Date()) {
      now.setFullYear(now.getFullYear() - 1);
    }
    return now.toISOString();
  }

  return new Date().toISOString();
}
