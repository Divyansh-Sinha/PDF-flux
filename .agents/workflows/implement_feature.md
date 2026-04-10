---
description: Implement a new feature using a full-stack approach
---

# Feature Implementation Workflow

When the user asks to implement a feature, ALWAYS follow this strict sequence:

1. **Pick the feature**: Identify the specific feature from the technical specification to work on. Keep the scope limited to ONE feature at a time.
2. **Check backend**: Review the current backend code. Implement or update the necessary endpoints, services, or models for the feature.
3. **Do frontend**: Update the React UI (components, API calls, state) to support the new feature.
4. **Integrate it**: Connect the frontend and backend, ensuring data flows correctly.
5. **Verify using tests**: Write/update tests (e.g., pytest for backend, simple manual tests via scripts, or browser testing if available) and ensure everything works seamlessly.
6. **Respond back for checking**: Once verified, stop and respond to the user, providing a summary of the implemented feature and asking for their review/checking. Wait for the user's go-ahead before starting the next feature.
