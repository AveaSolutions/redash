import React from "react";
import { render } from "@testing-library/react";

import { elementExists } from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import Editor from "./index";

function renderEditor(options: any, data: any) {
  options = getOptions(options);
  return render(
    <Editor visualizationName="Test" data={data} options={options} onOptionsChange={() => {}} />
  );
}

describe("Visualizations -> Chart -> Editor (wrapper)", () => {
  test("Renders generic wrapper", () => {
    const { container } = renderEditor({ globalSeriesType: "column" }, { columns: [], rows: [] });

    expect(elementExists(container, "VisualizationEditor.Tabs.General")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.XAxis")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.YAxis")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.Series")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.Colors")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.DataLabels")).toBeTruthy();

    expect(elementExists(container, "Chart.GlobalSeriesType")).toBeTruthy(); // general settings block exists
    expect(elementExists(container, "Chart.Custom.Code")).toBeFalsy(); // custom settings block does not exist
  });

  test("Renders wrapper for custom charts", () => {
    const { container } = renderEditor({ globalSeriesType: "custom" }, { columns: [], rows: [] });

    expect(elementExists(container, "VisualizationEditor.Tabs.General")).toBeTruthy();
    expect(elementExists(container, "VisualizationEditor.Tabs.XAxis")).toBeFalsy();
    expect(elementExists(container, "VisualizationEditor.Tabs.YAxis")).toBeFalsy();
    expect(elementExists(container, "VisualizationEditor.Tabs.Series")).toBeFalsy();
    expect(elementExists(container, "VisualizationEditor.Tabs.Colors")).toBeFalsy();
    expect(elementExists(container, "VisualizationEditor.Tabs.DataLabels")).toBeFalsy();

    expect(elementExists(container, "Chart.GlobalSeriesType")).toBeTruthy(); // general settings block exists
    expect(elementExists(container, "Chart.Custom.Code")).toBeTruthy(); // custom settings block exists
  });
});
