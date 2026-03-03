"use client";

import React from "react";

/**
 * Throws a test error so Airbrake Error Boundary can report it.
 * IMPORTANT: Remove this component from the page before building for production!
 */
export default function AirbrakeTestError(): React.ReactNode {
  throw new Error("TestError: This is a test");
}
