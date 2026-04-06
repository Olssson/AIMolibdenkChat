type SplineViewerElementProps = {
	url?: string;
	[key: string]: unknown;
};

declare global {
	namespace JSX {
		interface IntrinsicElements {
			"spline-viewer": SplineViewerElementProps;
		}
	}

	namespace React {
		namespace JSX {
			interface IntrinsicElements {
				"spline-viewer": SplineViewerElementProps;
			}
		}
	}
}

export {};
