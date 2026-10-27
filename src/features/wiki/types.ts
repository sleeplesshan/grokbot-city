export type WikiSource={id:string;taskId?:string;kind:string;title:string;markdown:string;createdAt:string;hash:string;botId?:string;tags?:string[];origin?:string};
export type WikiPage={id:string;title:string;summary:string;markdown:string;links:string[];sourceIds:string[];version:number;createdAt:string;updatedAt:string;deletedAt?:string|null};
export type WikiFinding={type:string;message:string;pageId?:string};
export type WikiJob={id:string;sourceId?:string;kind:string;requestKind?:string;status:string;version:number;note:string;createdAt:string;updatedAt:string;findings?:WikiFinding[];text?:string;pageId?:string;semanticReview?:string|null};
export type WikiData={sources:WikiSource[];pages:WikiPage[];jobs:WikiJob[];log:{id:string;action:string;at:string;note:string;pageId?:string;jobId?:string}[]};
