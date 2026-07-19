import CGraph from "views/graph.jsx";
import Company from "views/Index.jsx";

const routes = [
  {
    path: "/index",
    name: "Company",
    component: Company,
    layout: "/admin",
  },
  {
    path: "/graph",
    name: "Graph",
    component: CGraph,
    layout: "/admin",
  },
];

export default routes;
