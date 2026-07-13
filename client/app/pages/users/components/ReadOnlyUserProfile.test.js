import React from "react";
import { mount } from "enzyme";
import Group from "@/services/group";
import ReadOnlyUserProfile from "./ReadOnlyUserProfile";

beforeEach(() => {
  Group.query = jest.fn().mockResolvedValue([]);
});

test("renders correctly", () => {
  const user = {
    id: 2,
    name: "John Doe",
    email: "john@doe.com",
    groupIds: [],
    profileImageUrl: "http://www.images.com/llama.jpg",
  };

  const wrapper = mount(<ReadOnlyUserProfile user={user} />);
  expect(wrapper.find(".profile__container")).toMatchSnapshot();
});
