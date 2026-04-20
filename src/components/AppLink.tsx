"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import JoyLink, { type LinkProps as JoyLinkProps } from "@mui/joy/Link";
import { forwardRef } from "react";

type AppLinkProps = Omit<JoyLinkProps, "href"> & NextLinkProps;

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink(props, ref) {
    return <JoyLink ref={ref} component={NextLink} {...props} />;
  }
);

export default AppLink;
