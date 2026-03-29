import axios from "axios";

const api = axios.create({
  baseURL: "[localhost](http://localhost:3000)", // have to change to  deployed URL later
});

export default api;
