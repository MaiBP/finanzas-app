// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/auth/password-input";

describe("password visibility", () => {
  it("toggles between hidden and visible without changing the field value", () => {
    const {container}=render(<PasswordInput id="password" autoComplete="current-password"/>);
    const input=container.querySelector("input") as HTMLInputElement;
    input.value="secreto123";
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button",{name:"Mostrar contraseña"}));
    expect(input.type).toBe("text");
    expect(input.value).toBe("secreto123");
    fireEvent.click(screen.getByRole("button",{name:"Ocultar contraseña"}));
    expect(input.type).toBe("password");
  });
});
