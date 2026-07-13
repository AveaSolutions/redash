import { fireEvent, render, RenderResult } from "@testing-library/react";
import React from "react";

export function queryByDataTest(container: HTMLElement, testId: string): Element | null {
  const elements = container.querySelectorAll(`[data-test="${testId}"]`);
  return elements.length ? elements[elements.length - 1] : null;
}

export function elementExists(container: HTMLElement, testId: string): boolean {
  return queryByDataTest(container, testId) !== null;
}

export function clickDataTest(container: HTMLElement, testId: string): void {
  const element = queryByDataTest(container, testId);
  if (!element) {
    throw new Error(`Missing [data-test="${testId}"]`);
  }
  fireEvent.click(element);
}

export function mouseDownDataTest(container: HTMLElement, testId: string): void {
  const element = queryByDataTest(container, testId);
  if (!element) {
    throw new Error(`Missing [data-test="${testId}"]`);
  }
  fireEvent.mouseDown(element);
}

export function changeInput(container: HTMLElement, testId: string, value: string): void {
  const wrapper = queryByDataTest(container, testId);
  const input = wrapper?.querySelector("input");
  if (!input) {
    throw new Error(`Missing input under [data-test="${testId}"]`);
  }
  fireEvent.change(input, { target: { value } });
}

export function toggleCheckbox(container: HTMLElement, testId: string, checked = true): void {
  const wrapper = queryByDataTest(container, testId);
  const input = wrapper?.querySelector("input");
  if (!input) {
    throw new Error(`Missing checkbox under [data-test="${testId}"]`);
  }
  if ((input as HTMLInputElement).checked !== checked) {
    fireEvent.click(input);
  }
}

export function renderOptionsEditor(
  component: React.ReactElement,
  onComplete?: () => void
): RenderResult & { onOptionsChange: jest.Mock } {
  const onOptionsChange = jest.fn(changedOptions => {
    expect(changedOptions).toMatchSnapshot();
    onComplete?.();
  });

  const result = render(React.cloneElement(component, { onOptionsChange }));
  return { ...result, onOptionsChange };
}

export function renderColumnEditor(
  component: React.ReactElement,
  onComplete?: () => void
): RenderResult & { onChange: jest.Mock } {
  const onChange = jest.fn(changedColumn => {
    expect(changedColumn).toMatchSnapshot();
    onComplete?.();
  });

  const result = render(React.cloneElement(component, { onChange }));
  return { ...result, onChange };
}
