import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AWS Cognito Auth Course" },
    { name: "description", content: "Welcome to AWS Cognito Authentication Course" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AWS Cognito Auth
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to the authentication course
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/login"
            className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md text-center font-medium hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="block w-full bg-white text-blue-600 py-3 px-4 rounded-md text-center font-medium border-2 border-blue-600 hover:bg-blue-50 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
