"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker
          .register("/sw.js")
          .then(
            function (registration) {
              console.log(
                "Service Worker registration successful with scope: ",
                registration.scope,
              );
            },
            function (err) {
              console.log("Service Worker registration failed: ", err);
            },
          )
          .catch(function (err) {
            console.log(err);
          });
      });
    } else {
      console.log("Service Worker is not supported by browser.");
    }
  }, []);

  return null;
}
