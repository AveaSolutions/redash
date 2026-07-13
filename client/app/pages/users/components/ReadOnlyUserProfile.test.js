import React from "react";
import { render, waitFor } from "@testing-library/react";
import Group from "@/services/group";
import ReadOnlyUserProfile from "./ReadOnlyUserProfile";

beforeEach(() => {
  Group.query = jest.fn().mockResolvedValue([]);
});

test("renders correctly", async () => {
  const user = {
    id: 2,
    name: "John Doe",
    email: "john@doe.com",
    groupIds: [],
    profileImageUrl: "http://www.images.com/llama.jpg",
  };

  const { container } = render(<ReadOnlyUserProfile user={user} />);
  await waitFor(() => {
    expect(Group.query).toHaveBeenCalled();
  });
  expect(container.querySelector(".profile__container")).toMatchSnapshot();
});
