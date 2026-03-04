# Roadmap for Neuroverso

## Version 1.1
- **Features:**
  - [List features planned for v1.1]
- **Architectural Decisions:**
  - **Justification for no app native on Quest 3 MVP:**
    - The decision against a native app on Quest 3 for the MVP allows for faster iteration and a broader testing phase with existing web technologies, thereby reducing initial development costs and enabling feedback from a wider audience. This also permits easier updates and bug fixes, enhancing the overall user experience over time.

## Version 1.2
- **Features:**
  - [List features planned for v1.2]
- **Architectural Decisions:**
  - **Justification for using SFU for WebRTC:**
    - Utilizing SFU (Selective Forwarding Unit) optimizes bandwidth usage and improves performance in multi-party video conferencing scenarios. This architecture allows efficient use of resources since clients only receive streams relevant to them, enhancing the scalability and responsiveness of the application.

## Version 1.3
- **Features:**
  - [List features planned for v1.3]
- **Architectural Decisions:**
  - **Justification for shorts on-demand vs continuous recording:**
    - On-demand recording offers users flexibility and control over their content, catering to specific user needs and reducing storage costs. In contrast, continuous recording may provide more comprehensive data but risks overwhelming users with excessive information without clear value.

## Version 2.0
- **Features:**
  - [List features planned for v2.0]
- **Architectural Decisions:**
  - **Justification for GOV.BR for signature:**
    - Implementing GOV.BR electronic signatures enhances security and compliance with governmental regulations, ensuring that all transactions are traceable and authentic, thus building trust with users.
  - **Justification for PDF in storage vs DB:**
    - Storing PDFs directly in a database can lead to performance penalties and complicate data retrieval. Keeping them in external storage allows for easier management and quicker access, ensuring a smoother user experience while maintaining scalability.