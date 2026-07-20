import { lazy } from "react";

const CGraph = lazy(() => import("views/graph.jsx"));
const Company = lazy(() => import("views/Index.jsx"));
const Skill = lazy(() => import("views/Skill.jsx"));

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
  {
    path: "/skill",
    name: "Skill",
    component: Skill,
    layout: "/admin",
  },
];

export default routes;
