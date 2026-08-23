export async function fetchJobs() {
  try {
    const response = await fetch('./jobs.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const jobs = await response.json();
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
}
