/**
 * API module for BuilderLoop
 * Fetches job listings asynchronously from jobs.json
 */

export const fetchJobs = async () => {
  try {
    const response = await fetch('./jobs.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jobs = await response.json();
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
};
