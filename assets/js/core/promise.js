/**
 * Nakli server.
 *
 * Asli backend nahi hai, isliye ek Promise banate hain jo thodi der baad jawab deta hai,
 * bilkul server call ki tarah. Promise ki teen haalat hoti hain:
 *   pending   - jawab abhi aaya nahi (setTimeout chal raha hai)
 *   resolved  - kaam ho gaya, `resolve(value)` se value milti hai
 *   rejected  - kuch galat hua, `reject(error)` se error milta hai
 *
 * `work` ek normal function hai: jo woh return kare woh resolve hota hai,
 * jo woh throw kare woh reject hota hai.
 */
export const fakeServer = (work) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try {
      resolve(work());      // kaam ho gaya: Promise "resolved"
    } catch (error) {
      reject(error);        // kuch galat hua: Promise "rejected"
    }
  }, 500);
});
