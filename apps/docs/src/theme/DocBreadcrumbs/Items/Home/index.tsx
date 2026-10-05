/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * Ejected from @docusaurus/theme-classic 3.9.2 and re-diffed against 3.10.2, where upstream is
 * unchanged (theme/DocBreadcrumbs/Items/Home), the home icon
 * that opens every doc page's breadcrumbs. Upstream links it to the site root. When the
 * deployment redirects its root (DOCS_HOME_CANONICAL_PATH, see docusaurus.config.ts) that is a
 * link to a redirect on every doc page, so this links the page the root is sent to
 * (src/utils/servedUrl useHomePath). With homeCanonicalPath "/" it renders exactly what upstream
 * renders. Re-diff it against upstream on every Docusaurus upgrade (docusaurus.config.ts stops
 * the build when theme-classic leaves the minor it was ejected from).
 */
/// <reference types="@docusaurus/theme-classic" />
import React, { type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import IconHome from '@theme/Icon/Home';
import { useHomePath } from '../../../../utils/servedUrl';

import styles from './styles.module.css';

export default function HomeBreadcrumbItem(): ReactNode {
	const homeHref = useHomePath();

	return (
		<li className="breadcrumbs__item">
			<Link
				aria-label={translate({
					id: 'theme.docs.breadcrumbs.home',
					message: 'Home page',
					description: 'The ARIA label for the home page in the breadcrumbs'
				})}
				className="breadcrumbs__link"
				href={homeHref}
			>
				<IconHome className={styles.breadcrumbHomeIcon} />
			</Link>
		</li>
	);
}
